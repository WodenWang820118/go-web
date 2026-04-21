import { Injectable } from '@angular/core';
import {
  createUniqueDisplayName,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomSnapshot,
} from '@gx/go/contracts';
import { StoredRoomIdentity } from '../online-room-storage/online-room-storage.service';

/**
 * Handles hosted-room identity normalization and join/create identity resolution.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomIdentityService {
  normalizeRoomId(roomId: string): string {
    return roomId.toUpperCase();
  }

  resolveJoinDisplayName(
    requestedDisplayName: string,
    snapshot: RoomSnapshot | null,
    storedIdentity: StoredRoomIdentity | null,
  ): string {
    return createUniqueDisplayName(
      requestedDisplayName,
      snapshot?.participants.map((participant) => participant.displayName) ??
        [],
      {
        currentName:
          storedIdentity?.participantId && snapshot
            ? (snapshot.participants.find(
                (participant) =>
                  participant.participantId === storedIdentity.participantId,
              )?.displayName ?? null)
            : null,
      },
    );
  }

  resolveResponseDisplayName(
    requestedDisplayName: string,
    response: CreateRoomResponse | JoinRoomResponse,
  ): string {
    return (
      response.snapshot.participants.find(
        (participant) => participant.participantId === response.participantId,
      )?.displayName ?? requestedDisplayName.trim()
    );
  }

  createStoredRoomIdentity(
    displayName: string,
    response: CreateRoomResponse | JoinRoomResponse,
  ): StoredRoomIdentity {
    return {
      displayName,
      participantId: response.participantId,
      participantToken: response.participantToken,
    };
  }
}
