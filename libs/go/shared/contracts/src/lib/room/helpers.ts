import { RoomSnapshot } from './snapshots';

/**
 * Deep-clones a room snapshot so callers can mutate their local copy safely.
 */
export function cloneRoomSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return structuredClone(snapshot);
}
