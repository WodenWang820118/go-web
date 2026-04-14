import {
  LobbyRoomStatus,
  LobbyRoomSummary,
  RoomSnapshot,
} from '@gx/go/contracts';
import { Injectable } from '@nestjs/common';
import { RoomsStore } from './rooms.store';
import { ParticipantRecord, RoomRecord } from './rooms.types';

/**
 * Maps mutable room records to immutable API payloads.
 */
@Injectable()
export class RoomsSnapshotMapper {
  constructor(private readonly store: RoomsStore = new RoomsStore()) {}

  toSnapshot(room: RoomRecord): RoomSnapshot {
    const participants = [...room.participants.values()]
      .map(participant => ({
        participantId: participant.id,
        displayName: participant.displayName,
        seat: participant.seat,
        isHost: participant.isHost,
        online: participant.online,
        muted: participant.muted,
        joinedAt: participant.joinedAt,
      }))
      .sort((left, right) => {
        if (left.isHost !== right.isHost) {
          return left.isHost ? -1 : 1;
        }

        return left.joinedAt.localeCompare(right.joinedAt);
      });

    return {
      roomId: room.id,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      hostParticipantId: room.hostParticipantId,
      participants,
      seatState: {
        black: this.store.getSeatHolder(room, 'black')?.id ?? null,
        white: this.store.getSeatHolder(room, 'white')?.id ?? null,
      },
      nextMatchSettings: structuredClone(room.nextMatchSettings),
      rematch: room.rematch ? structuredClone(room.rematch) : null,
      autoStartBlockedUntilSeatChange: room.autoStartBlockedUntilSeatChange,
      match: room.match ? structuredClone(room.match) : null,
      chat: structuredClone(room.chat),
    };
  }

  toLobbySummary(room: RoomRecord): LobbyRoomSummary {
    const host = room.participants.get(room.hostParticipantId);
    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');
    const onlineCount = [...room.participants.values()].filter(
      participant => participant.online
    ).length;

    return {
      roomId: room.id,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      hostDisplayName: host?.displayName ?? 'Host',
      status: this.getLobbyStatus(room, black, white),
      mode:
        room.match && room.match.state.phase !== 'finished'
          ? room.match.settings.mode
          : room.nextMatchSettings.mode,
      boardSize:
        room.match && room.match.state.phase !== 'finished'
          ? room.match.settings.boardSize
          : room.nextMatchSettings.boardSize,
      players: {
        black: black?.displayName ?? null,
        white: white?.displayName ?? null,
      },
      participantCount: room.participants.size,
      onlineCount,
      spectatorCount: [...room.participants.values()].filter(
        participant => participant.seat === null
      ).length,
    };
  }

  compareLobbyRooms(left: LobbyRoomSummary, right: LobbyRoomSummary): number {
    const statusOrder = this.compareLobbyStatus(left.status, right.status);

    if (statusOrder !== 0) {
      return statusOrder;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  }

  private getLobbyStatus(
    room: RoomRecord,
    black: ParticipantRecord | null,
    white: ParticipantRecord | null
  ): LobbyRoomStatus {
    if (room.match && room.match.state.phase !== 'finished') {
      return 'live';
    }

    if (black && white) {
      return 'ready';
    }

    return 'waiting';
  }

  private compareLobbyStatus(
    left: LobbyRoomStatus,
    right: LobbyRoomStatus
  ): number {
    const order: Record<LobbyRoomStatus, number> = {
      live: 0,
      ready: 1,
      waiting: 2,
    };

    return order[left] - order[right];
  }
}
