import { Injectable } from '@angular/core';
import {
  ChatMessageEvent,
  GameUpdatedEvent,
  RoomPresenceEvent,
  RoomSnapshot,
} from '@gx/go/contracts';

const CHAT_HISTORY_LIMIT = 100;

/**
 * Applies immutable hosted-room snapshot updates and snapshot-derived helpers.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomSnapshotService {
  applyRoomPresence(
    snapshot: RoomSnapshot,
    event: RoomPresenceEvent,
  ): RoomSnapshot {
    return {
      ...snapshot,
      participants: event.participants,
      seatState: event.seatState,
    };
  }

  applyGameUpdated(
    snapshot: RoomSnapshot,
    event: GameUpdatedEvent,
  ): RoomSnapshot {
    return {
      ...snapshot,
      match: event.match ? structuredClone(event.match) : null,
    };
  }

  applyChatMessage(
    snapshot: RoomSnapshot,
    event: ChatMessageEvent,
  ): RoomSnapshot {
    return {
      ...snapshot,
      chat: [...snapshot.chat, event.message].slice(-CHAT_HISTORY_LIMIT),
    };
  }

  buildRoomShareUrl(roomId: string | null, locationOrigin: string): string {
    if (!roomId || !locationOrigin) {
      return '';
    }

    return `${locationOrigin}/online/room/${roomId}`;
  }
}
