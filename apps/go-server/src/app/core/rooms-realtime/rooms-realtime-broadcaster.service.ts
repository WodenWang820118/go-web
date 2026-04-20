import { Injectable } from '@nestjs/common';
import {
  GameUpdatedEvent,
  RoomClosedEvent,
  RoomPresenceEvent,
  RoomSnapshot,
  SystemNotice,
  SystemNoticeEvent,
} from '@gx/go/contracts';
import { Server } from 'socket.io';

/**
 * Shared socket broadcaster used by both the gateway and REST-triggered room lifecycle actions.
 */
@Injectable()
export class RoomsRealtimeBroadcasterService {
  private server: Server | null = null;

  registerServer(server: Server): void {
    this.server = server;
  }

  broadcastRoomSnapshot(snapshot: RoomSnapshot): void {
    this.server?.to(this.roomChannel(snapshot.roomId)).emit('room.snapshot', snapshot);
  }

  broadcastPresence(snapshot: RoomSnapshot): void {
    const payload: RoomPresenceEvent = {
      roomId: snapshot.roomId,
      participants: snapshot.participants,
      seatState: snapshot.seatState,
    };

    this.server?.to(this.roomChannel(snapshot.roomId)).emit('room.presence', payload);
  }

  broadcastGameState(snapshot: RoomSnapshot): void {
    const payload: GameUpdatedEvent = {
      roomId: snapshot.roomId,
      match: snapshot.match,
    };

    this.server?.to(this.roomChannel(snapshot.roomId)).emit('game.updated', payload);
  }

  broadcastNotice(roomId: string, notice: SystemNotice): void {
    const payload: SystemNoticeEvent = {
      roomId,
      notice,
    };

    this.server?.to(this.roomChannel(roomId)).emit('system.notice', payload);
  }

  broadcastRoomClosed(event: RoomClosedEvent): void {
    this.server?.to(this.roomChannel(event.roomId)).emit('room.closed', event);
  }

  disconnectSockets(socketIds: readonly string[], delayMs = 0): void {
    if (!this.server) {
      return;
    }

    const disconnect = () => {
      for (const socketId of socketIds) {
        this.server?.sockets.sockets.get(socketId)?.disconnect(true);
      }
    };

    if (delayMs <= 0) {
      disconnect();
      return;
    }

    setTimeout(disconnect, delayMs).unref();
  }

  private roomChannel(roomId: string): string {
    return `room:${roomId}`;
  }
}
