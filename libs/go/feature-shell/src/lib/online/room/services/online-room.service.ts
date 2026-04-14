import { HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import {
  cloneRoomSnapshot,
  CreateRoomResponse,
  GameCommand,
  GameStartSettings,
  JoinRoomResponse,
  RoomSnapshot,
} from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  defer,
  finalize,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { OnlineRoomSocketService } from './online-room-socket.service';
import { OnlineRoomsHttpService } from './online-rooms-http.service';
import {
  OnlineRoomStorageService,
} from './online-room-storage.service';
import { OnlineRoomIdentityService } from './online-room-identity.service';
import { OnlineRoomSnapshotService } from './online-room-snapshot.service';
import {
  selectCanChangeSeats,
  selectCanInteractBoard,
  selectChatMessages,
  selectHostedMatch,
  selectIsActivePlayer,
  selectRoomParticipants,
  selectViewer,
  selectViewerIsHost,
  selectViewerIsMuted,
  selectViewerSeat,
} from '../online-room-selectors';
import {
  BootstrapState,
  JOIN_ROOM_REQUIRED_MESSAGE,
  OnlineRoomRealtimeEvent,
  REALTIME_UNAVAILABLE_MESSAGE,
} from '../online-room.service.models';

/**
 * Frontend facade for a single hosted multiplayer room.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomService {
  private readonly api = inject(OnlineRoomsHttpService);
  private readonly i18n = inject(GoI18nService);
  private readonly storage = inject(OnlineRoomStorageService);
  private readonly socket = inject(OnlineRoomSocketService);
  private readonly identity = inject(OnlineRoomIdentityService);
  private readonly snapshots = inject(OnlineRoomSnapshotService);
  private bootstrapSubscription: Subscription | null = null;
  private readonly browserOrigin =
    typeof window === 'undefined' ? '' : window.location.origin;

  private readonly activeRoomIdSignal = signal<string | null>(null);
  private readonly snapshotSignal = signal<RoomSnapshot | null>(null);
  private readonly participantIdSignal = signal<string | null>(null);
  private readonly participantTokenSignal = signal<string | null>(null);
  private readonly displayNameSignal = signal('');
  private readonly bootstrapStateSignal = signal<BootstrapState>('idle');
  private readonly joiningSignal = signal(false);
  private readonly creatingSignal = signal(false);
  private readonly lastErrorSignal = signal<string | null>(null);
  private readonly lastNoticeSignal = signal<string | null>(null);

  readonly roomId = this.activeRoomIdSignal.asReadonly();
  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly participantId = this.participantIdSignal.asReadonly();
  readonly participantToken = this.participantTokenSignal.asReadonly();
  readonly displayName = this.displayNameSignal.asReadonly();
  readonly bootstrapState = this.bootstrapStateSignal.asReadonly();
  readonly connectionState = this.socket.connectionState;
  readonly joining = this.joiningSignal.asReadonly();
  readonly creating = this.creatingSignal.asReadonly();
  readonly lastError = this.lastErrorSignal.asReadonly();
  readonly lastNotice = this.lastNoticeSignal.asReadonly();

  readonly participants = computed(() => selectRoomParticipants(this.snapshotSignal()));
  readonly match = computed(() => selectHostedMatch(this.snapshotSignal()));
  readonly chat = computed(() => selectChatMessages(this.snapshotSignal()));
  readonly viewer = computed(() =>
    selectViewer(this.participants(), this.participantIdSignal())
  );
  readonly nextMatchSettings = computed(
    () => this.snapshotSignal()?.nextMatchSettings ?? null
  );
  readonly rematch = computed(() => this.snapshotSignal()?.rematch ?? null);
  readonly autoStartBlockedUntilSeatChange = computed(
    () => this.snapshotSignal()?.autoStartBlockedUntilSeatChange ?? false
  );
  readonly viewerSeat = computed(() => selectViewerSeat(this.viewer()));
  readonly isHost = computed(() => selectViewerIsHost(this.viewer()));
  readonly isMuted = computed(() => selectViewerIsMuted(this.viewer()));
  readonly isActivePlayer = computed(() =>
    selectIsActivePlayer(this.match(), this.viewerSeat())
  );
  readonly canInteractBoard = computed(() =>
    selectCanInteractBoard(this.match(), this.viewerSeat())
  );
  readonly canChangeSeats = computed(() => selectCanChangeSeats(this.match()));
  readonly shareUrl = computed(() =>
    this.snapshots.buildRoomShareUrl(this.activeRoomIdSignal(), this.browserOrigin)
  );

  constructor() {
    this.bindRealtimeEvents();
  }

  /**
   * Loads a hosted room and restores a saved participant identity when possible.
   */
  bootstrapRoom(roomId: string): void {
    const normalizedRoomId = this.identity.normalizeRoomId(roomId);

    this.bootstrapSubscription?.unsubscribe();
    this.resetForRoom(normalizedRoomId);
    this.bootstrapStateSignal.set('loading');
    this.lastErrorSignal.set(null);

    const stored = this.storage.get(normalizedRoomId);

    this.bootstrapSubscription = this.api
      .getRoom(normalizedRoomId)
      .pipe(
        tap(response => {
          this.snapshotSignal.set(cloneRoomSnapshot(response.snapshot));
          this.bootstrapStateSignal.set('ready');

          if (stored) {
            this.displayNameSignal.set(stored.displayName);
          }
        }),
        switchMap(() => {
          if (!stored) {
            return of(void 0);
          }

          return this.api
            .joinRoom(normalizedRoomId, stored.displayName, stored.participantToken)
            .pipe(
              tap(response => {
                this.applyJoinResponse(normalizedRoomId, stored.displayName, response);
              }),
              map(() => void 0)
            );
        }),
        catchError(error => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.bootstrapStateSignal.set('missing');
            this.snapshotSignal.set(null);
            return EMPTY;
          }

          this.bootstrapStateSignal.set('ready');
          this.lastErrorSignal.set(
            this.api.describeHttpError(error, 'room.client.unexpected_network_error')
          );
          return EMPTY;
        }),
        finalize(() => {
          this.bootstrapSubscription = null;
        })
      )
      .subscribe();
  }

  createRoom(displayName: string): Observable<CreateRoomResponse> {
    return defer(() => {
      this.creatingSignal.set(true);
      this.lastErrorSignal.set(null);

      return this.api.createRoom(displayName).pipe(
        tap(response => {
          this.applyJoinResponse(response.roomId, displayName, response);
        }),
        catchError(error => {
          this.lastErrorSignal.set(
            this.api.describeHttpError(error, 'room.client.unexpected_network_error')
          );
          return throwError(() => error);
        }),
        finalize(() => {
          this.creatingSignal.set(false);
        })
      );
    });
  }

  joinRoom(roomId: string, displayName: string): Observable<void> {
    return defer(() => {
      this.joiningSignal.set(true);
      this.lastErrorSignal.set(null);

      const normalizedRoomId = this.identity.normalizeRoomId(roomId);
      const stored = this.storage.get(normalizedRoomId);
      const resolvedDisplayName = this.identity.resolveJoinDisplayName(
        displayName,
        this.snapshotSignal(),
        stored
      );

      return this.api
        .joinRoom(normalizedRoomId, resolvedDisplayName, stored?.participantToken)
        .pipe(
          tap(response => {
            this.applyJoinResponse(normalizedRoomId, resolvedDisplayName, response);
          }),
          map(() => void 0),
          catchError(error => {
            this.lastErrorSignal.set(
              this.api.describeHttpError(error, 'room.client.unexpected_network_error')
            );
            return throwError(() => error);
          }),
          finalize(() => {
            this.joiningSignal.set(false);
          })
        );
    });
  }

  claimSeat(color: PlayerColor): void {
    this.emit('seat.claim', {
      color,
    });
  }

  releaseSeat(): void {
    this.emit('seat.release');
  }

  updateNextMatchSettings(settings: GameStartSettings): void {
    this.emit('room.settings.update', {
      settings,
    });
  }

  sendGameCommand(command: GameCommand): void {
    this.emit('game.command', {
      command,
    });
  }

  sendChat(message: string): void {
    this.emit('chat.send', {
      message,
    });
  }

  muteParticipant(targetParticipantId: string): void {
    this.emit('host.mute', {
      targetParticipantId,
    });
  }

  unmuteParticipant(targetParticipantId: string): void {
    this.emit('host.unmute', {
      targetParticipantId,
    });
  }

  kickParticipant(targetParticipantId: string): void {
    this.emit('host.kick', {
      targetParticipantId,
    });
  }

  respondToRematch(accepted: boolean): void {
    this.emit('game.rematch.respond', {
      accepted,
    });
  }

  clearTransientMessages(): void {
    this.lastErrorSignal.set(null);
    this.lastNoticeSignal.set(null);
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  private bindRealtimeEvents(): void {
    this.socket.roomSnapshot$.subscribe(snapshot => {
      this.snapshotSignal.set(cloneRoomSnapshot(snapshot));
    });
    this.socket.roomPresence$.subscribe(event => {
      this.updateSnapshot(snapshot => this.snapshots.applyRoomPresence(snapshot, event));
    });
    this.socket.gameUpdated$.subscribe(event => {
      this.updateSnapshot(snapshot => this.snapshots.applyGameUpdated(snapshot, event));
    });
    this.socket.chatMessage$.subscribe(event => {
      this.updateSnapshot(snapshot => this.snapshots.applyChatMessage(snapshot, event));
    });
    this.socket.notice$.subscribe(event => {
      this.lastNoticeSignal.set(this.i18n.translateMessage(event.notice.message));
    });
    this.socket.commandError$.subscribe(event => {
      this.lastErrorSignal.set(this.i18n.translateMessage(event.message));
    });
  }

  private applyJoinResponse(
    roomId: string,
    requestedDisplayName: string,
    response: CreateRoomResponse | JoinRoomResponse
  ): void {
    const resolvedDisplayName = this.identity.resolveResponseDisplayName(
      requestedDisplayName,
      response
    );

    this.activeRoomIdSignal.set(this.identity.normalizeRoomId(roomId));
    this.snapshotSignal.set(cloneRoomSnapshot(response.snapshot));
    this.participantIdSignal.set(response.participantId);
    this.participantTokenSignal.set(response.participantToken);
    this.displayNameSignal.set(resolvedDisplayName);
    this.bootstrapStateSignal.set('ready');

    const identity = this.identity.createStoredRoomIdentity(resolvedDisplayName, response);
    this.storage.set(roomId, identity);
    this.socket.connect(roomId, response.participantToken);
  }

  private emit(
    event: OnlineRoomRealtimeEvent,
    payload: Record<string, unknown> = {}
  ): void {
    const roomId = this.activeRoomIdSignal();
    const participantToken = this.participantTokenSignal();

    if (!roomId || !participantToken) {
      this.lastErrorSignal.set(this.i18n.t(JOIN_ROOM_REQUIRED_MESSAGE));
      return;
    }

    const emitted = this.socket.emit(event, {
      roomId,
      participantToken,
      ...payload,
    });

    if (!emitted) {
      this.lastErrorSignal.set(this.i18n.t(REALTIME_UNAVAILABLE_MESSAGE));
    }
  }

  private updateSnapshot(
    updater: (snapshot: RoomSnapshot) => RoomSnapshot
  ): void {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return;
    }

    this.snapshotSignal.set(updater(cloneRoomSnapshot(snapshot)));
  }

  private resetForRoom(roomId: string): void {
    if (this.activeRoomIdSignal() !== roomId) {
      this.socket.disconnect();
    }

    this.activeRoomIdSignal.set(roomId);
    this.snapshotSignal.set(null);
    this.participantIdSignal.set(null);
    this.participantTokenSignal.set(null);
    this.displayNameSignal.set('');
    this.lastNoticeSignal.set(null);
  }
}
