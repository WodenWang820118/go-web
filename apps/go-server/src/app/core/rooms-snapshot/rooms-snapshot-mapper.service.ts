import {
  LobbyOnlineParticipantActivity,
  LobbyOnlineParticipantSummary,
  LobbyRoomStatus,
  LobbyRoomSummary,
  ROOM_SNAPSHOT_SCHEMA_VERSION,
  RoomSnapshot,
  normalizeRoomSnapshot,
} from '@gx/go/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { ParticipantRecord, RoomRecord } from '../../contracts/rooms.types';
import { RoomsStore } from '../rooms-store/rooms-store.service';

/**
 * Maps mutable room records to immutable API payloads.
 */
@Injectable()
export class RoomsSnapshotMapper {
  constructor(@Inject(RoomsStore) private readonly store: RoomsStore) {}

  toSnapshot(room: RoomRecord): RoomSnapshot {
    const participants = [...room.participants.values()]
      .map((participant) => ({
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

    return normalizeRoomSnapshot({
      schemaVersion: ROOM_SNAPSHOT_SCHEMA_VERSION,
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
      nigiri: room.nigiri ? structuredClone(room.nigiri) : null,
      rules: this.getRulesMetadata(room),
      chat: structuredClone(room.chat),
    });
  }

  toLobbySummary(room: RoomRecord): LobbyRoomSummary {
    const host = room.participants.get(room.hostParticipantId);
    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');
    const onlineCount = [...room.participants.values()].filter(
      (participant) => participant.online,
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
        (participant) => participant.seat === null,
      ).length,
    };
  }

  toLobbyOnlineParticipants(
    rooms: readonly RoomRecord[],
  ): LobbyOnlineParticipantSummary[] {
    const sortedRooms = [...rooms].sort((left, right) =>
      this.compareLobbyRooms(
        this.toLobbySummary(left),
        this.toLobbySummary(right),
      ),
    );
    const roomOrder = new Map(
      sortedRooms.map((room, index) => [room.id, index] as const),
    );

    return sortedRooms
      .flatMap((room) => {
        const black = this.store.getSeatHolder(room, 'black');
        const white = this.store.getSeatHolder(room, 'white');
        const status = this.getLobbyStatus(room, black, white);

        return [...room.participants.values()]
          .filter((participant) => participant.online)
          .map<LobbyOnlineParticipantSummary>((participant) => ({
            participantId: participant.id,
            displayName: participant.displayName,
            roomId: room.id,
            seat: participant.seat,
            isHost: participant.isHost,
            joinedAt: participant.joinedAt,
            activity: this.getLobbyParticipantActivity(participant, status),
          }));
      })
      .sort((left, right) =>
        this.compareLobbyParticipants(left, right, roomOrder),
      );
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
    white: ParticipantRecord | null,
  ): LobbyRoomStatus {
    if (room.match && room.match.state.phase !== 'finished') {
      return 'live';
    }

    if (black && white) {
      return 'ready';
    }

    return 'waiting';
  }

  private getRulesMetadata(room: RoomRecord): RoomSnapshot['rules'] {
    const settings = room.match?.settings ?? room.nextMatchSettings;

    if (!settings.ruleset || !settings.openingRule) {
      return null;
    }

    return {
      ruleset: settings.ruleset,
      openingRule: settings.openingRule,
      timeControl: settings.timeControl ?? null,
    };
  }

  private compareLobbyStatus(
    left: LobbyRoomStatus,
    right: LobbyRoomStatus,
  ): number {
    const order: Record<LobbyRoomStatus, number> = {
      live: 0,
      ready: 1,
      waiting: 2,
    };

    return order[left] - order[right];
  }

  private getLobbyParticipantActivity(
    participant: ParticipantRecord,
    roomStatus: LobbyRoomStatus,
  ): LobbyOnlineParticipantActivity {
    if (participant.seat === null) {
      return 'watching';
    }

    return roomStatus === 'live' ? 'playing' : 'seated';
  }

  private compareLobbyParticipants(
    left: LobbyOnlineParticipantSummary,
    right: LobbyOnlineParticipantSummary,
    roomOrder: ReadonlyMap<string, number>,
  ): number {
    const activityOrder = this.compareLobbyParticipantActivity(
      left.activity,
      right.activity,
    );

    if (activityOrder !== 0) {
      return activityOrder;
    }

    const leftRoomOrder = roomOrder.get(left.roomId) ?? Number.MAX_SAFE_INTEGER;
    const rightRoomOrder =
      roomOrder.get(right.roomId) ?? Number.MAX_SAFE_INTEGER;

    if (leftRoomOrder !== rightRoomOrder) {
      return leftRoomOrder - rightRoomOrder;
    }

    const seatOrder = this.compareLobbyParticipantSeat(left.seat, right.seat);

    if (seatOrder !== 0) {
      return seatOrder;
    }

    if (left.isHost !== right.isHost) {
      return left.isHost ? -1 : 1;
    }

    const joinedAtOrder = left.joinedAt.localeCompare(right.joinedAt);

    if (joinedAtOrder !== 0) {
      return joinedAtOrder;
    }

    return left.displayName.localeCompare(right.displayName);
  }

  private compareLobbyParticipantActivity(
    left: LobbyOnlineParticipantActivity,
    right: LobbyOnlineParticipantActivity,
  ): number {
    const order: Record<LobbyOnlineParticipantActivity, number> = {
      playing: 0,
      seated: 1,
      watching: 2,
    };

    return order[left] - order[right];
  }

  private compareLobbyParticipantSeat(
    left: ParticipantRecord['seat'],
    right: ParticipantRecord['seat'],
  ): number {
    const order = {
      black: 0,
      white: 1,
      null: 2,
    } as const;

    return order[left ?? 'null'] - order[right ?? 'null'];
  }
}
