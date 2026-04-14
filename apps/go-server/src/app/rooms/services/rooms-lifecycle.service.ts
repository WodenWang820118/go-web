import {
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
  RoomSnapshot,
  createUniqueDisplayName,
} from '@gx/go/contracts';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  CREATE_ATTEMPTS_PER_WINDOW,
  JOIN_ATTEMPTS_PER_WINDOW,
  MAX_DISPLAY_NAME_LENGTH,
  THROTTLE_WINDOW_MS,
} from '../rooms.constants';
import { badRequestMessage, throttledMessage } from '../rooms.errors';
import { RoomsSnapshotMapper } from '../rooms.snapshot.mapper';
import { RoomsStore } from '../rooms.store';

/**
 * Handles room creation, joining, presence sockets, and lifecycle cleanup.
 */
@Injectable()
export class RoomsLifecycleService implements OnModuleDestroy {
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsSnapshotMapper)
    private readonly snapshotMapper: RoomsSnapshotMapper
  ) {
    this.cleanupTimer = setInterval(
      () => this.store.pruneExpiredRooms(),
      60 * 1000
    );
  }

  createRoom(displayName: string, requesterKey: string): CreateRoomResponse {
    this.assertAttemptWithinLimit(
      requesterKey,
      CREATE_ATTEMPTS_PER_WINDOW,
      'room.error.too_many_create_attempts'
    );

    const sanitizedName = this.sanitizeDisplayName(displayName);
    const now = this.store.timestamp();
    const host = this.store.createParticipant(sanitizedName, true, now);
    const room = this.store.createRoomRecord(host, now);
    this.store.rooms.set(room.id, room);

    return {
      roomId: room.id,
      participantToken: host.token,
      participantId: host.id,
      snapshot: this.snapshotMapper.toSnapshot(room),
    };
  }

  joinRoom(
    roomId: string,
    displayName: string,
    participantToken: string | undefined,
    requesterKey: string
  ): JoinRoomResponse {
    this.assertAttemptWithinLimit(
      requesterKey,
      JOIN_ATTEMPTS_PER_WINDOW,
      'room.error.too_many_join_attempts'
    );

    const room = this.store.getRoomRecord(roomId);
    const sanitizedName = this.sanitizeDisplayName(displayName);
    let participant =
      participantToken && participantToken.trim().length > 0
        ? this.store.tryGetParticipantByToken(room, participantToken)
        : null;
    const resumed = participant !== null;

    const uniqueDisplayName = createUniqueDisplayName(
      sanitizedName,
      [...room.participants.values()]
        .filter(currentParticipant => currentParticipant.id !== participant?.id)
        .map(currentParticipant => currentParticipant.displayName)
    );

    if (participant) {
      participant.displayName = uniqueDisplayName;
    } else {
      participant = this.store.createParticipant(
        uniqueDisplayName,
        false,
        this.store.timestamp()
      );
      room.participants.set(participant.id, participant);
      room.tokenIndex.set(participant.token, participant.id);
    }

    this.store.touchRoom(room);

    return {
      roomId: room.id,
      participantToken: participant.token,
      participantId: participant.id,
      resumed,
      snapshot: this.snapshotMapper.toSnapshot(room),
    };
  }

  getRoom(roomId: string): GetRoomResponse {
    return {
      snapshot: this.snapshotMapper.toSnapshot(this.store.getRoomRecord(roomId)),
    };
  }

  listRooms(): ListRoomsResponse {
    const rooms = [...this.store.rooms.values()]
      .filter(room => !this.store.isRoomOffline(room))
      .map(room => this.snapshotMapper.toLobbySummary(room))
      .sort((left, right) => this.snapshotMapper.compareLobbyRooms(left, right));

    return {
      rooms,
    };
  }

  connectParticipantSocket(
    roomId: string,
    participantToken: string,
    socketId: string
  ): RoomSnapshot {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);

    participant.socketIds.add(socketId);
    participant.online = true;
    this.store.socketIndex.set(socketId, {
      roomId: room.id,
      participantId: participant.id,
    });
    room.emptySince = null;
    this.store.touchRoom(room);

    return this.snapshotMapper.toSnapshot(room);
  }

  disconnectSocket(socketId: string): RoomSnapshot | null {
    const entry = this.store.socketIndex.get(socketId);

    if (!entry) {
      return null;
    }

    this.store.socketIndex.delete(socketId);

    const room = this.store.rooms.get(entry.roomId);

    if (!room) {
      return null;
    }

    const participant = room.participants.get(entry.participantId);

    if (participant) {
      participant.socketIds.delete(socketId);
      participant.online = participant.socketIds.size > 0;
    }

    if (this.store.isRoomOffline(room)) {
      room.emptySince ??= Date.now();
    }

    this.store.touchRoom(room);

    return this.snapshotMapper.toSnapshot(room);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  private assertAttemptWithinLimit(
    key: string,
    limit: number,
    messageKey: string
  ): void {
    const now = Date.now();
    const timestamps = (this.store.attemptWindows.get(key) ?? []).filter(
      timestamp => now - timestamp < THROTTLE_WINDOW_MS
    );

    if (timestamps.length >= limit) {
      this.store.attemptWindows.set(key, timestamps);
      throw throttledMessage(messageKey);
    }

    timestamps.push(now);
    this.store.attemptWindows.set(key, timestamps);
  }

  private sanitizeDisplayName(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      throw badRequestMessage('room.error.display_name_required');
    }

    if (normalized.length > MAX_DISPLAY_NAME_LENGTH) {
      throw badRequestMessage('room.error.display_name_too_long', {
        max: MAX_DISPLAY_NAME_LENGTH,
      });
    }

    return normalized;
  }
}
