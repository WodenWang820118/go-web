import {
  ChatMessageEvent,
  GameUpdatedEvent,
  RoomPresenceEvent,
  RoomSnapshot,
} from '@gx/go/contracts';

const CHAT_HISTORY_LIMIT = 100;

/**
 * Applies a presence update without mutating the existing room snapshot.
 */
export function applyRoomPresence(
  snapshot: RoomSnapshot,
  event: RoomPresenceEvent
): RoomSnapshot {
  return {
    ...snapshot,
    participants: event.participants,
    seatState: event.seatState,
  };
}

/**
 * Applies a hosted match update without mutating the existing room snapshot.
 */
export function applyGameUpdated(
  snapshot: RoomSnapshot,
  event: GameUpdatedEvent
): RoomSnapshot {
  return {
    ...snapshot,
    match: event.match ? structuredClone(event.match) : null,
  };
}

/**
 * Appends a chat message while keeping the room chat capped to the latest history window.
 */
export function applyChatMessage(
  snapshot: RoomSnapshot,
  event: ChatMessageEvent
): RoomSnapshot {
  return {
    ...snapshot,
    chat: [...snapshot.chat, event.message].slice(-CHAT_HISTORY_LIMIT),
  };
}

export function buildRoomShareUrl(
  roomId: string | null,
  locationOrigin: string
): string {
  if (!roomId || !locationOrigin) {
    return '';
  }

  return `${locationOrigin}/online/room/${roomId}`;
}
