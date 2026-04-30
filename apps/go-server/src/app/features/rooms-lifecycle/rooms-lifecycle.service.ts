import {
  CreateRoomResponse,
  GameStartSettings,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
  RoomSnapshot,
} from '@gx/go/contracts';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  CREATE_ATTEMPTS_PER_WINDOW,
  JOIN_ATTEMPTS_PER_WINDOW,
} from '../../core/rooms-config/rooms.constants';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import {
  CloseRoomResult,
  JoinRoomMutationResult,
} from '../../contracts/rooms.types';
import { RoomsClockService } from '../rooms-match/rooms-clock.service';
import { RoomsMatchNigiriService } from '../rooms-match/rooms-match-nigiri.service';
import { RoomsMatchSettingsService } from '../rooms-match/rooms-match-settings';
import { RoomsDisplayNameService } from './rooms-display-name.service';
import { RoomsRequestThrottleService } from './rooms-request-throttle.service';

const DEFAULT_CREATE_ROOM_SETTINGS: GameStartSettings = {
  mode: 'go',
  boardSize: 19,
};

const NOOP_CLOCKS: Pick<RoomsClockService, 'clear' | 'sweepStaleRooms'> = {
  clear() {
    // Tests that instantiate the service directly can ignore process timers.
  },
  sweepStaleRooms() {
    // Tests that instantiate the service directly can ignore process timers.
  },
};

/**
 * Handles room creation, joining, presence sockets, and lifecycle cleanup.
 */
@Injectable()
export class RoomsLifecycleService implements OnModuleDestroy {
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsSnapshotMapper)
    private readonly snapshotMapper: RoomsSnapshotMapper,
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
    @Inject(RoomsMatchSettingsService)
    private readonly matchSettings: RoomsMatchSettingsService = new RoomsMatchSettingsService(
      roomsErrors,
    ),
    @Inject(RoomsDisplayNameService)
    private readonly displayNames: RoomsDisplayNameService = new RoomsDisplayNameService(
      roomsErrors,
    ),
    @Inject(RoomsRequestThrottleService)
    private readonly requestThrottle: RoomsRequestThrottleService = new RoomsRequestThrottleService(
      store,
      roomsErrors,
    ),
    @Inject(RoomsMatchNigiriService)
    private readonly nigiri: RoomsMatchNigiriService = new RoomsMatchNigiriService(
      store,
      roomsErrors,
    ),
    @Inject(RoomsClockService)
    private readonly clocks: Pick<
      RoomsClockService,
      'clear' | 'sweepStaleRooms'
    > = NOOP_CLOCKS,
  ) {
    this.cleanupTimer = setInterval(() => {
      this.store.pruneExpiredRooms();
      this.clocks.sweepStaleRooms();
    }, 60 * 1000);
  }

  createRoom(
    displayName: string,
    requesterKey: string,
    settings: GameStartSettings = DEFAULT_CREATE_ROOM_SETTINGS,
  ): CreateRoomResponse {
    this.requestThrottle.assertWithinLimit(
      requesterKey,
      CREATE_ATTEMPTS_PER_WINDOW,
      'room.error.too_many_create_attempts',
    );

    const sanitizedName = this.displayNames.sanitize(displayName);
    const nextMatchSettings =
      this.matchSettings.normalizeHostedStartSettings(settings);
    const now = this.store.timestamp();
    const host = this.store.createParticipant(sanitizedName, true, now);
    const room = this.store.createRoomRecord(host, now, nextMatchSettings);
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
    requesterKey: string,
  ): JoinRoomResponse {
    return this.joinRoomMutation(
      roomId,
      displayName,
      participantToken,
      requesterKey,
    ).response;
  }

  joinRoomMutation(
    roomId: string,
    displayName: string,
    participantToken: string | undefined,
    requesterKey: string,
  ): JoinRoomMutationResult {
    this.requestThrottle.assertWithinLimit(
      requesterKey,
      JOIN_ATTEMPTS_PER_WINDOW,
      'room.error.too_many_join_attempts',
    );

    const room = this.store.getRoomRecord(roomId);
    let participant =
      participantToken && participantToken.trim().length > 0
        ? this.store.tryGetParticipantByToken(room, participantToken)
        : null;
    const resumed = participant !== null;

    const uniqueDisplayName = this.displayNames.uniqueForParticipants(
      displayName,
      room.participants.values(),
      participant?.id ?? null,
    );

    if (participant) {
      participant.displayName = uniqueDisplayName;
    } else {
      participant = this.store.createParticipant(
        uniqueDisplayName,
        false,
        this.store.timestamp(),
      );
      room.participants.set(participant.id, participant);
      room.tokenIndex.set(participant.token, participant.id);
    }

    this.store.touchRoom(room);
    const nigiriNotice = this.nigiri.prepareRoomForDirectNigiri(room);
    const snapshot = this.snapshotMapper.toSnapshot(room);
    const response = {
      roomId: room.id,
      participantToken: participant.token,
      participantId: participant.id,
      resumed,
      snapshot,
    };

    return {
      response,
      notice: nigiriNotice ? this.store.createNotice(nigiriNotice) : undefined,
    };
  }

  getRoom(roomId: string): GetRoomResponse {
    return {
      snapshot: this.snapshotMapper.toSnapshot(
        this.store.getRoomRecord(roomId),
      ),
    };
  }

  listRooms(): ListRoomsResponse {
    const lobbyRooms = [...this.store.rooms.values()].filter(
      (room) => !this.store.isRoomOffline(room),
    );
    const rooms = lobbyRooms
      .map((room) => this.snapshotMapper.toLobbySummary(room))
      .sort((left, right) =>
        this.snapshotMapper.compareLobbyRooms(left, right),
      );

    return {
      rooms,
      onlineParticipants:
        this.snapshotMapper.toLobbyOnlineParticipants(lobbyRooms),
    };
  }

  closeRoom(roomId: string, participantToken: string): CloseRoomResult {
    const room = this.store.getRoomRecord(roomId);
    const host = this.store.assertHostParticipant(room, participantToken);
    const socketIds = [...room.participants.values()].flatMap((participant) => [
      ...participant.socketIds,
    ]);

    for (const socketId of socketIds) {
      this.store.socketIndex.delete(socketId);
    }

    this.clocks.clear(room.id);
    this.store.rooms.delete(room.id);

    return {
      roomId: room.id,
      socketIds,
      event: {
        roomId: room.id,
        message: this.roomsErrors.roomMessage('room.notice.closed_by_host', {
          displayName: host.displayName,
        }),
      },
    };
  }

  connectParticipantSocket(
    roomId: string,
    participantToken: string,
    socketId: string,
  ): RoomSnapshot {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(
      room,
      participantToken,
    );

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
}
