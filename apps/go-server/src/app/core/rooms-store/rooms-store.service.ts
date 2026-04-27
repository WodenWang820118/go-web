import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_HOSTED_BYO_YOMI,
  GO_AREA_AGREEMENT_RULESET,
  GO_DIGITAL_NIGIRI_OPENING,
  GoMessageDescriptor,
  PlayerColor,
} from '@gx/go/domain';
import { GameStartSettings, SystemNotice } from '@gx/go/contracts';
import {
  ROOM_ID_ALPHABET,
  ROOM_ID_LENGTH,
  ROOM_IDLE_TTL_MS,
  THROTTLE_WINDOW_MS,
} from '../rooms-config/rooms.constants';
import { RoomsErrorsService } from '../rooms-errors/rooms-errors.service';
import {
  ParticipantRecord,
  RoomRecord,
  SocketIndexEntry,
} from '../../contracts/rooms.types';

/**
 * Owns the in-memory room state and low-level lookup helpers for hosted rooms.
 */
@Injectable()
export class RoomsStore {
  readonly rooms = new Map<string, RoomRecord>();
  readonly socketIndex = new Map<string, SocketIndexEntry>();
  readonly attemptWindows = new Map<string, number[]>();

  constructor(
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
  ) {}

  createParticipant(
    displayName: string,
    isHost: boolean,
    joinedAt: string,
  ): ParticipantRecord {
    return {
      id: this.createId(),
      token: this.createId(),
      displayName,
      seat: null,
      isHost,
      online: false,
      muted: false,
      joinedAt,
      socketIds: new Set<string>(),
      chatTimestamps: [],
    };
  }

  createRoomRecord(
    host: ParticipantRecord,
    createdAt: string,
    nextMatchSettings: GameStartSettings = {
      mode: 'go',
      boardSize: 19,
      komi: DEFAULT_GO_KOMI,
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    },
  ): RoomRecord {
    return {
      id: this.generateRoomId(),
      createdAt,
      updatedAt: createdAt,
      hostParticipantId: host.id,
      participants: new Map([[host.id, host]]),
      tokenIndex: new Map([[host.token, host.id]]),
      nextMatchSettings,
      rematch: null,
      autoStartBlockedUntilSeatChange: false,
      match: null,
      nigiri: null,
      nigiriSecret: null,
      chat: [],
      emptySince: null,
    };
  }

  createNotice(message: GoMessageDescriptor): SystemNotice {
    return {
      id: this.createId(),
      message,
      createdAt: this.timestamp(),
    };
  }

  getRoomRecord(roomId: string): RoomRecord {
    const normalized = roomId.trim().toUpperCase();
    const room = this.rooms.get(normalized);

    if (!room) {
      throw this.roomsErrors.notFound('room.error.not_found', {
        roomId: normalized,
      });
    }

    return room;
  }

  tryGetParticipantByToken(
    room: RoomRecord,
    participantToken: string,
  ): ParticipantRecord | null {
    const participantId = room.tokenIndex.get(participantToken.trim());

    return participantId
      ? (room.participants.get(participantId) ?? null)
      : null;
  }

  getParticipantByToken(
    room: RoomRecord,
    participantToken: string,
  ): ParticipantRecord {
    const participant = this.tryGetParticipantByToken(room, participantToken);

    if (!participant) {
      throw this.roomsErrors.forbidden('room.error.invalid_participant_token');
    }

    return participant;
  }

  getParticipantById(
    room: RoomRecord,
    participantId: string,
  ): ParticipantRecord {
    const participant = room.participants.get(participantId);

    if (!participant) {
      throw this.roomsErrors.notFound('room.error.participant_not_found');
    }

    return participant;
  }

  assertHostParticipant(
    room: RoomRecord,
    participantToken: string,
  ): ParticipantRecord {
    const participant = this.getParticipantByToken(room, participantToken);

    if (!participant.isHost) {
      throw this.roomsErrors.forbidden('room.error.host_only_action');
    }

    return participant;
  }

  getSeatHolder(
    room: RoomRecord,
    color: PlayerColor,
  ): ParticipantRecord | null {
    for (const participant of room.participants.values()) {
      if (participant.seat === color) {
        return participant;
      }
    }

    return null;
  }

  isRoomOffline(room: RoomRecord): boolean {
    return [...room.participants.values()].every(
      (participant) => !participant.online,
    );
  }

  touchRoom(room: RoomRecord): void {
    room.updatedAt = this.timestamp();
  }

  timestamp(): string {
    return new Date().toISOString();
  }

  pruneExpiredRooms(): void {
    const now = Date.now();

    for (const [roomId, room] of this.rooms.entries()) {
      const referenceTime = room.emptySince ?? Date.parse(room.createdAt);
      const isStale = now - referenceTime >= ROOM_IDLE_TTL_MS;

      if (isStale && this.isRoomOffline(room)) {
        this.rooms.delete(roomId);
      }
    }

    for (const [key, timestamps] of this.attemptWindows.entries()) {
      const active = timestamps.filter(
        (timestamp) => now - timestamp < THROTTLE_WINDOW_MS,
      );

      if (active.length === 0) {
        this.attemptWindows.delete(key);
      } else {
        this.attemptWindows.set(key, active);
      }
    }
  }

  private createId(): string {
    return crypto.randomUUID();
  }

  private generateRoomId(): string {
    let roomId = '';

    do {
      roomId = Array.from({ length: ROOM_ID_LENGTH }, () => {
        const index = Math.floor(Math.random() * ROOM_ID_ALPHABET.length);
        return ROOM_ID_ALPHABET[index];
      }).join('');
    } while (this.rooms.has(roomId));

    return roomId;
  }
}
