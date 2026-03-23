import { HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import {
  cloneRoomSnapshot,
  CreateRoomResponse,
  GameCommand,
  GameStartSettings,
  JoinRoomResponse,
  RoomSnapshot,
} from '@org/go/contracts';
import { PlayerColor } from '@org/go/domain';
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
  StoredRoomIdentity,
} from './online-room-storage.service';

type BootstrapState = 'idle' | 'loading' | 'ready' | 'missing';

@Injectable({ providedIn: 'root' })
export class OnlineRoomService {
  private readonly api = inject(OnlineRoomsHttpService);
  private readonly storage = inject(OnlineRoomStorageService);
  private readonly socket = inject(OnlineRoomSocketService);
  private bootstrapSubscription: Subscription | null = null;

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

  readonly participants = computed(() => this.snapshotSignal()?.participants ?? []);
  readonly match = computed(() => this.snapshotSignal()?.match ?? null);
  readonly chat = computed(() => this.snapshotSignal()?.chat ?? []);
  readonly viewer = computed(() => {
    const participantId = this.participantIdSignal();

    return participantId
      ? (this.participants().find(
          participant => participant.participantId === participantId
        ) ?? null)
      : null;
  });
  readonly viewerSeat = computed(() => this.viewer()?.seat ?? null);
  readonly isHost = computed(() => this.viewer()?.isHost ?? false);
  readonly isMuted = computed(() => this.viewer()?.muted ?? false);
  readonly isActivePlayer = computed(() => {
    const match = this.match();
    const seat = this.viewerSeat();

    return (
      !!match &&
      !!seat &&
      match.state.phase === 'playing' &&
      match.state.nextPlayer === seat
    );
  });
  readonly canInteractBoard = computed(() => {
    const match = this.match();
    const seat = this.viewerSeat();

    if (!match || !seat || match.state.phase === 'finished') {
      return false;
    }

    if (match.state.phase === 'scoring') {
      return true;
    }

    return match.state.nextPlayer === seat;
  });
  readonly canChangeSeats = computed(() => {
    const match = this.match();

    return !match || match.state.phase === 'finished';
  });
  readonly shareUrl = computed(() => {
    const roomId = this.activeRoomIdSignal();

    if (!roomId || typeof window === 'undefined') {
      return '';
    }

    return `${window.location.origin}/online/room/${roomId}`;
  });

  constructor() {
    this.bindRealtimeEvents();
  }

  bootstrapRoom(roomId: string): void {
    const normalizedRoomId = roomId.toUpperCase();

    if (
      this.activeRoomIdSignal() === normalizedRoomId &&
      this.bootstrapStateSignal() === 'ready'
    ) {
      return;
    }

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
            this.api.describeHttpError(error, 'Unexpected network error.')
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
            this.api.describeHttpError(error, 'Unexpected network error.')
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

      const normalizedRoomId = roomId.toUpperCase();
      const stored = this.storage.get(normalizedRoomId);

      return this.api
        .joinRoom(normalizedRoomId, displayName, stored?.participantToken)
        .pipe(
          tap(response => {
            this.applyJoinResponse(normalizedRoomId, displayName, response);
          }),
          map(() => void 0),
          catchError(error => {
            this.lastErrorSignal.set(
              this.api.describeHttpError(error, 'Unexpected network error.')
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

  startMatch(settings: GameStartSettings): void {
    this.emit('game.start', {
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
      this.updateSnapshot(snapshot => ({
        ...snapshot,
        participants: event.participants,
        seatState: event.seatState,
      }));
    });
    this.socket.gameUpdated$.subscribe(event => {
      this.updateSnapshot(snapshot => ({
        ...snapshot,
        match: event.match ? structuredClone(event.match) : null,
      }));
    });
    this.socket.chatMessage$.subscribe(event => {
      this.updateSnapshot(snapshot => ({
        ...snapshot,
        chat: [...snapshot.chat, event.message].slice(-100),
      }));
    });
    this.socket.notice$.subscribe(event => {
      this.lastNoticeSignal.set(event.notice.message);
    });
    this.socket.commandError$.subscribe(event => {
      this.lastErrorSignal.set(event.message);
    });
  }

  private applyJoinResponse(
    roomId: string,
    displayName: string,
    response: CreateRoomResponse | JoinRoomResponse
  ): void {
    this.activeRoomIdSignal.set(roomId.toUpperCase());
    this.snapshotSignal.set(cloneRoomSnapshot(response.snapshot));
    this.participantIdSignal.set(response.participantId);
    this.participantTokenSignal.set(response.participantToken);
    this.displayNameSignal.set(displayName.trim());
    this.bootstrapStateSignal.set('ready');

    const identity: StoredRoomIdentity = {
      displayName: displayName.trim(),
      participantId: response.participantId,
      participantToken: response.participantToken,
    };

    this.storage.set(roomId, identity);
    this.socket.connect(roomId, response.participantToken);
  }

  private emit(
    event:
      | 'seat.claim'
      | 'seat.release'
      | 'game.start'
      | 'game.command'
      | 'chat.send'
      | 'host.mute'
      | 'host.unmute'
      | 'host.kick',
    payload: Record<string, unknown> = {}
  ): void {
    const roomId = this.activeRoomIdSignal();
    const participantToken = this.participantTokenSignal();

    if (!roomId || !participantToken) {
      this.lastErrorSignal.set('Join the room before sending realtime commands.');
      return;
    }

    const emitted = this.socket.emit(event, {
      roomId,
      participantToken,
      ...payload,
    });

    if (!emitted) {
      this.lastErrorSignal.set('Join the room before sending realtime commands.');
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
