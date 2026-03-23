import { Injectable } from '@angular/core';

/**
 * Persisted identity used to restore a participant into the same hosted room.
 */
export interface StoredRoomIdentity {
  displayName: string;
  participantId: string;
  participantToken: string;
}

/**
 * Local storage adapter for hosted room identities.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomStorageService {
  private readonly prefix = 'gx.go.online.room.';

  get(roomId: string): StoredRoomIdentity | null {
    const storage = this.storage();

    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(this.key(roomId));

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<StoredRoomIdentity>;

      if (
        typeof parsed.displayName !== 'string' ||
        typeof parsed.participantId !== 'string' ||
        typeof parsed.participantToken !== 'string'
      ) {
        return null;
      }

      return {
        displayName: parsed.displayName,
        participantId: parsed.participantId,
        participantToken: parsed.participantToken,
      };
    } catch {
      return null;
    }
  }

  set(roomId: string, identity: StoredRoomIdentity): void {
    const storage = this.storage();

    if (!storage) {
      return;
    }

    storage.setItem(this.key(roomId), JSON.stringify(identity));
  }

  clear(roomId: string): void {
    const storage = this.storage();

    if (!storage) {
      return;
    }

    storage.removeItem(this.key(roomId));
  }

  private storage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }

  private key(roomId: string): string {
    return `${this.prefix}${roomId.toUpperCase()}`;
  }
}
