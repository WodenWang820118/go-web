import { Injectable, inject, signal } from '@angular/core';
import {
  ChatMessageEvent,
  CommandErrorEvent,
  GameUpdatedEvent,
  RoomPresenceEvent,
  RoomSnapshot,
  SystemNoticeEvent,
} from '@org/go/contracts';
import { GO_SERVER_ORIGIN } from '@org/go/state';
import { Subject } from 'rxjs';
import { Socket, io } from 'socket.io-client';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

/**
 * Thin websocket adapter for hosted room realtime events.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomSocketService {
  private readonly serverOrigin = inject(GO_SERVER_ORIGIN);
  private socket: Socket | null = null;

  private readonly connectionStateSignal = signal<ConnectionState>('idle');
  private readonly roomSnapshotSubject = new Subject<RoomSnapshot>();
  private readonly roomPresenceSubject = new Subject<RoomPresenceEvent>();
  private readonly gameUpdatedSubject = new Subject<GameUpdatedEvent>();
  private readonly chatMessageSubject = new Subject<ChatMessageEvent>();
  private readonly noticeSubject = new Subject<SystemNoticeEvent>();
  private readonly commandErrorSubject = new Subject<CommandErrorEvent>();

  readonly connectionState = this.connectionStateSignal.asReadonly();
  readonly roomSnapshot$ = this.roomSnapshotSubject.asObservable();
  readonly roomPresence$ = this.roomPresenceSubject.asObservable();
  readonly gameUpdated$ = this.gameUpdatedSubject.asObservable();
  readonly chatMessage$ = this.chatMessageSubject.asObservable();
  readonly notice$ = this.noticeSubject.asObservable();
  readonly commandError$ = this.commandErrorSubject.asObservable();

  connect(roomId: string, participantToken: string): void {
    this.disconnect();

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
      this.roomSnapshotSubject.next(snapshot);
    });
    socket.on('room.presence', (event: RoomPresenceEvent) => {
      this.roomPresenceSubject.next(event);
    });
    socket.on('game.updated', (event: GameUpdatedEvent) => {
      this.gameUpdatedSubject.next(event);
    });
    socket.on('chat.message', (event: ChatMessageEvent) => {
      this.chatMessageSubject.next(event);
    });
    socket.on('system.notice', (event: SystemNoticeEvent) => {
      this.noticeSubject.next(event);
    });
    socket.on('command.error', (event: CommandErrorEvent) => {
      this.commandErrorSubject.next(event);
    });

    this.connectionStateSignal.set('connecting');
    socket.connect();
    this.socket = socket;
  }

  emit(event: string, payload: Record<string, unknown>): boolean {
    if (!this.socket) {
      return false;
    }

    this.socket.emit(event, payload);
    return true;
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connectionStateSignal.set('idle');
  }
}
