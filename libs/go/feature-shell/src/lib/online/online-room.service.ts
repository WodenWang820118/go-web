import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import {
  ChatMessageEvent,
  cloneRoomSnapshot,
  CommandErrorEvent,
  CreateRoomResponse,
  GameCommand,
  GameUpdatedEvent,
  GameStartSettings,
  GetRoomResponse,
  JoinRoomResponse,
  RoomPresenceEvent,
  RoomSnapshot,
  SystemNoticeEvent,
} from '@org/go/contracts';
import { PlayerColor } from '@org/go/domain';
import { firstValueFrom } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import {
  OnlineRoomStorageService,
  StoredRoomIdentity,
} from './online-room-storage.service';

type BootstrapState = 'idle' | 'loading' | 'ready' | 'missing';
type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

@Injectable({ providedIn: 'root' })
export class OnlineRoomService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(OnlineRoomStorageService);
  private readonly serverOrigin = this.resolveServerOrigin();
  private readonly apiBase = `${this.serverOrigin}/api/rooms`;
  private socket: Socket | null = null;

  private readonly activeRoomIdSignal = signal<string | null>(null);
  private readonly snapshotSignal = signal<RoomSnapshot | null>(null);
  private readonly participantIdSignal = signal<string | null>(null);
  private readonly participantTokenSignal = signal<string | null>(null);
  private readonly displayNameSignal = signal('');
  private readonly bootstrapStateSignal = signal<BootstrapState>('idle');
  private readonly connectionStateSignal = signal<ConnectionState>('idle');
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
  readonly connectionState = this.connectionStateSignal.asReadonly();
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

  async bootstrapRoom(roomId: string): Promise<void> {
    const normalizedRoomId = roomId.toUpperCase();

    if (
      this.activeRoomIdSignal() === normalizedRoomId &&
      this.bootstrapStateSignal() === 'ready'
    ) {
      return;
    }

    this.resetForRoom(normalizedRoomId);
    this.bootstrapStateSignal.set('loading');
    this.lastErrorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<GetRoomResponse>(`${this.apiBase}/${normalizedRoomId}`)
      );
      this.snapshotSignal.set(cloneRoomSnapshot(response.snapshot));
      this.bootstrapStateSignal.set('ready');

      const stored = this.storage.get(normalizedRoomId);
      if (stored) {
        this.displayNameSignal.set(stored.displayName);
        await this.joinRoom(normalizedRoomId, stored.displayName);
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.bootstrapStateSignal.set('missing');
        this.snapshotSignal.set(null);
        return;
      }

      this.bootstrapStateSignal.set('ready');
      this.lastErrorSignal.set(this.describeHttpError(error));
    }
  }

  async createRoom(displayName: string): Promise<CreateRoomResponse> {
    this.creatingSignal.set(true);
    this.lastErrorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<CreateRoomResponse>(this.apiBase, {
          displayName,
        })
      );

      this.applyJoinResponse(response.roomId, displayName, response);
      return response;
    } catch (error) {
      this.lastErrorSignal.set(this.describeHttpError(error));
      throw error;
    } finally {
      this.creatingSignal.set(false);
    }
  }

  async joinRoom(roomId: string, displayName: string): Promise<void> {
    this.joiningSignal.set(true);
    this.lastErrorSignal.set(null);

    try {
      const stored = this.storage.get(roomId);
      const response = await firstValueFrom(
        this.http.post<JoinRoomResponse>(`${this.apiBase}/${roomId}/join`, {
          displayName,
          participantToken: stored?.participantToken,
        })
      );

      this.applyJoinResponse(roomId, displayName, response);
    } catch (error) {
      this.lastErrorSignal.set(this.describeHttpError(error));
      throw error;
    } finally {
      this.joiningSignal.set(false);
    }
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
    this.destroySocket();
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
    this.connectSocket(roomId, response.participantToken);
  }

  private connectSocket(roomId: string, participantToken: string): void {
    this.destroySocket();

    const socket = io(this.serverOrigin || undefined, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
    });

    socket.on('connect', () => {
      this.connectionStateSignal.set('connected');
      socket.emit('room.join', {
        roomId,
        participantToken,
      });
    });
    socket.on('disconnect', () => {
      this.connectionStateSignal.set('disconnected');
    });
    socket.on('room.snapshot', (snapshot: RoomSnapshot) => {
      this.snapshotSignal.set(cloneRoomSnapshot(snapshot));
    });
    socket.on('room.presence', (event: RoomPresenceEvent) => {
      this.updateSnapshot(snapshot => ({
        ...snapshot,
        participants: event.participants,
        seatState: event.seatState,
      }));
    });
    socket.on('game.updated', (event: GameUpdatedEvent) => {
      this.updateSnapshot(snapshot => ({
        ...snapshot,
        match: event.match ? structuredClone(event.match) : null,
      }));
    });
    socket.on('chat.message', (event: ChatMessageEvent) => {
      this.updateSnapshot(snapshot => ({
        ...snapshot,
        chat: [...snapshot.chat, event.message].slice(-100),
      }));
    });
    socket.on('system.notice', (event: SystemNoticeEvent) => {
      this.lastNoticeSignal.set(event.notice.message);
    });
    socket.on('command.error', (event: CommandErrorEvent) => {
      this.lastErrorSignal.set(event.message);
    });

    this.connectionStateSignal.set('connecting');
    socket.connect();
    this.socket = socket;
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
    const socket = this.socket;
    const roomId = this.activeRoomIdSignal();
    const participantToken = this.participantTokenSignal();

    if (!socket || !roomId || !participantToken) {
      this.lastErrorSignal.set('Join the room before sending realtime commands.');
      return;
    }

    socket.emit(event, {
      roomId,
      participantToken,
      ...payload,
    });
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
      this.destroySocket();
    }

    this.activeRoomIdSignal.set(roomId);
    this.participantIdSignal.set(null);
    this.participantTokenSignal.set(null);
    this.displayNameSignal.set('');
    this.lastNoticeSignal.set(null);
  }

  private destroySocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connectionStateSignal.set('idle');
  }

  private resolveServerOrigin(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const { protocol, hostname, port } = window.location;

    if (port === '4200') {
      return `${protocol}//${hostname}:3000`;
    }

    return '';
  }

  private describeHttpError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Unexpected network error.';
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    if (Array.isArray(error.error?.message)) {
      return error.error.message.join(', ');
    }

    return error.message;
  }
}
