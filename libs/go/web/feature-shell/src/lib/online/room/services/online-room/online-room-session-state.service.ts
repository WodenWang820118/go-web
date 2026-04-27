import { computed, Injectable, inject, signal } from '@angular/core';
import {
  cloneRoomSnapshot,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomClosedEvent,
  RoomSnapshot,
  SystemNotice,
} from '@gx/go/contracts';
import { OnlineRoomSelectorsService } from '../online-room-selectors/online-room-selectors.service';
import { OnlineRoomSnapshotService } from '../online-room-snapshot/online-room-snapshot.service';
import { BootstrapState } from '../../contracts/online-room-service.contracts';

type JoinResponse = CreateRoomResponse | JoinRoomResponse;

/**
 * Owns the local hosted-room session signals and derived selectors.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomSessionStateService {
  private readonly selectors = inject(OnlineRoomSelectorsService);
  private readonly snapshots = inject(OnlineRoomSnapshotService);
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
  private readonly lastSystemNoticeSignal = signal<SystemNotice | null>(null);
  private readonly roomClosedSignal = signal<RoomClosedEvent | null>(null);
  private readonly closingRoomSignal = signal(false);

  readonly roomId = this.activeRoomIdSignal.asReadonly();
  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly participantId = this.participantIdSignal.asReadonly();
  readonly participantToken = this.participantTokenSignal.asReadonly();
  readonly displayName = this.displayNameSignal.asReadonly();
  readonly bootstrapState = this.bootstrapStateSignal.asReadonly();
  readonly joining = this.joiningSignal.asReadonly();
  readonly creating = this.creatingSignal.asReadonly();
  readonly lastError = this.lastErrorSignal.asReadonly();
  readonly lastNotice = this.lastNoticeSignal.asReadonly();
  readonly lastSystemNotice = this.lastSystemNoticeSignal.asReadonly();
  readonly roomClosed = this.roomClosedSignal.asReadonly();
  readonly closingRoom = this.closingRoomSignal.asReadonly();

  readonly participants = computed(() =>
    this.selectors.selectRoomParticipants(this.snapshotSignal()),
  );
  readonly match = computed(() =>
    this.selectors.selectHostedMatch(this.snapshotSignal()),
  );
  readonly chat = computed(() =>
    this.selectors.selectChatMessages(this.snapshotSignal()),
  );
  readonly viewer = computed(() =>
    this.selectors.selectViewer(
      this.participants(),
      this.participantIdSignal(),
    ),
  );
  readonly nextMatchSettings = computed(
    () => this.snapshotSignal()?.nextMatchSettings ?? null,
  );
  readonly nigiri = computed(() => this.snapshotSignal()?.nigiri ?? null);
  readonly rematch = computed(() => this.snapshotSignal()?.rematch ?? null);
  readonly autoStartBlockedUntilSeatChange = computed(
    () => this.snapshotSignal()?.autoStartBlockedUntilSeatChange ?? false,
  );
  readonly viewerSeat = computed(() =>
    this.selectors.selectViewerSeat(this.viewer()),
  );
  readonly isHost = computed(() =>
    this.selectors.selectViewerIsHost(this.viewer()),
  );
  readonly isMuted = computed(() =>
    this.selectors.selectViewerIsMuted(this.viewer()),
  );
  readonly isActivePlayer = computed(() =>
    this.selectors.selectIsActivePlayer(this.match(), this.viewerSeat()),
  );
  readonly canInteractBoard = computed(() =>
    this.selectors.selectCanInteractBoard(this.match(), this.viewerSeat()),
  );
  readonly canChangeSeats = computed(() =>
    this.selectors.selectCanChangeSeats(this.match()),
  );
  readonly shareUrl = computed(() =>
    this.snapshots.buildRoomShareUrl(
      this.activeRoomIdSignal(),
      this.browserOrigin,
    ),
  );

  resetForRoom(roomId: string): void {
    this.activeRoomIdSignal.set(roomId);
    this.snapshotSignal.set(null);
    this.participantIdSignal.set(null);
    this.participantTokenSignal.set(null);
    this.displayNameSignal.set('');
    this.lastNoticeSignal.set(null);
    this.lastSystemNoticeSignal.set(null);
    this.roomClosedSignal.set(null);
    this.closingRoomSignal.set(false);
  }

  setSnapshot(snapshot: RoomSnapshot | null): void {
    this.snapshotSignal.set(snapshot ? cloneRoomSnapshot(snapshot) : null);
  }

  updateSnapshot(updater: (snapshot: RoomSnapshot) => RoomSnapshot): void {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return;
    }

    this.snapshotSignal.set(updater(cloneRoomSnapshot(snapshot)));
  }

  applyJoinResponse(
    roomId: string,
    resolvedDisplayName: string,
    response: JoinResponse,
  ): void {
    this.activeRoomIdSignal.set(roomId);
    this.setSnapshot(response.snapshot);
    this.participantIdSignal.set(response.participantId);
    this.participantTokenSignal.set(response.participantToken);
    this.displayNameSignal.set(resolvedDisplayName);
    this.bootstrapStateSignal.set('ready');
  }

  clearClosedRoomState(): void {
    this.activeRoomIdSignal.set(null);
    this.snapshotSignal.set(null);
    this.participantIdSignal.set(null);
    this.participantTokenSignal.set(null);
    this.bootstrapStateSignal.set('ready');
    this.lastNoticeSignal.set(null);
    this.lastSystemNoticeSignal.set(null);
    this.closingRoomSignal.set(false);
  }

  clearTransientMessages(): void {
    this.lastErrorSignal.set(null);
    this.lastNoticeSignal.set(null);
    this.lastSystemNoticeSignal.set(null);
  }

  clearRoomClosedEvent(): void {
    this.roomClosedSignal.set(null);
  }

  getSessionCredentials(): {
    roomId: string;
    participantToken: string;
  } | null {
    const roomId = this.activeRoomIdSignal();
    const participantToken = this.participantTokenSignal();

    if (!roomId || !participantToken) {
      return null;
    }

    return {
      roomId,
      participantToken,
    };
  }

  setBootstrapState(state: BootstrapState): void {
    this.bootstrapStateSignal.set(state);
  }

  setDisplayName(displayName: string): void {
    this.displayNameSignal.set(displayName);
  }

  setJoining(joining: boolean): void {
    this.joiningSignal.set(joining);
  }

  setCreating(creating: boolean): void {
    this.creatingSignal.set(creating);
  }

  setClosingRoom(closingRoom: boolean): void {
    this.closingRoomSignal.set(closingRoom);
  }

  setLastError(message: string | null): void {
    this.lastErrorSignal.set(message);
  }

  setLastNotice(message: string | null): void {
    this.lastNoticeSignal.set(message);
  }

  setLastSystemNotice(notice: SystemNotice | null): void {
    this.lastSystemNoticeSignal.set(notice);
  }

  setRoomClosed(event: RoomClosedEvent | null): void {
    this.roomClosedSignal.set(event);
  }
}
