import {
  createUniqueDisplayName,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomSnapshot,
} from '@gx/go/contracts';
import { StoredRoomIdentity } from './online-room-storage.service';

/**
 * Normalizes hosted room ids to the uppercase format used by the backend and URLs.
 */
export function normalizeRoomId(roomId: string): string {
  return roomId.toUpperCase();
}

/**
 * Resolves a room-safe display name while allowing an existing participant to keep their name.
 */
export function resolveJoinDisplayName(
  requestedDisplayName: string,
  snapshot: RoomSnapshot | null,
  storedIdentity: StoredRoomIdentity | null
): string {
  return createUniqueDisplayName(
    requestedDisplayName,
    snapshot?.participants.map(participant => participant.displayName) ?? [],
    {
      currentName:
        storedIdentity?.participantId && snapshot
          ? snapshot.participants.find(
              participant => participant.participantId === storedIdentity.participantId
            )?.displayName ?? null
          : null,
    }
  );
}

/**
 * Resolves the effective display name after create/join responses return the canonical participant list.
 */
export function resolveResponseDisplayName(
  requestedDisplayName: string,
  response: CreateRoomResponse | JoinRoomResponse
): string {
  return (
    response.snapshot.participants.find(
      participant => participant.participantId === response.participantId
    )?.displayName ?? requestedDisplayName.trim()
  );
}

/**
 * Converts a join response into the locally persisted room identity payload.
 */
export function createStoredRoomIdentity(
  displayName: string,
  response: CreateRoomResponse | JoinRoomResponse
): StoredRoomIdentity {
  return {
    displayName,
    participantId: response.participantId,
    participantToken: response.participantToken,
  };
}
