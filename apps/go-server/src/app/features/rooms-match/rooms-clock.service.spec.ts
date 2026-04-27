import { Logger } from '@nestjs/common';
import { vi } from 'vitest';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsRealtimeBroadcasterService } from '../../core/rooms-realtime/rooms-realtime-broadcaster.service';
import { RoomsRulesEngineService } from '../../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { ParticipantRecord, RoomRecord } from '../../contracts/rooms.types';
import { RoomsClockService } from './rooms-clock.service';
import {
  startMatchWithCurrentSeats,
  type RoomsMatchTransitionDependencies,
} from './rooms-match-transitions';

describe('RoomsClockService', () => {
  let service: RoomsClockService;
  let store: RoomsStore;
  let realtime: Pick<
    RoomsRealtimeBroadcasterService,
    'broadcastMutationResult'
  >;
  let dependencies: RoomsMatchTransitionDependencies;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));

    const roomsErrors = new RoomsErrorsService();
    store = new RoomsStore(roomsErrors);
    realtime = {
      broadcastMutationResult: vi.fn(),
    };
    service = new RoomsClockService(
      store,
      new RoomsSnapshotMapper(store),
      realtime as RoomsRealtimeBroadcasterService,
    );
    dependencies = {
      logger: new Logger('rooms-clock.service.spec'),
      store,
      rulesEngines: new RoomsRulesEngineService(),
      roomsErrors,
    };
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('finishes and broadcasts a hosted match when the active clock expires', async () => {
    const { room, host, guest } = createRoomWithSeatedPlayers(store);

    startMatchWithCurrentSeats(
      room,
      {
        mode: 'gomoku',
        boardSize: 15,
        komi: 0,
        timeControl: {
          mainTimeMs: 0,
          periodTimeMs: 100,
          periods: 1,
        },
      },
      dependencies,
    );

    service.refresh(room);
    await vi.advanceTimersByTimeAsync(150);

    expect(room.match?.state.phase).toBe('finished');
    expect(room.match?.state.result).toMatchObject({
      winner: 'white',
      reason: 'timeout',
    });
    expect(room.rematch).toEqual({
      participants: {
        black: host.id,
        white: guest.id,
      },
      responses: {
        black: 'pending',
        white: 'pending',
      },
    });
    expect(realtime.broadcastMutationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({
          roomId: room.id,
          match: expect.objectContaining({
            state: expect.objectContaining({
              phase: 'finished',
            }),
          }),
        }),
        notice: expect.objectContaining({
          message: expect.objectContaining({
            key: 'room.notice.timeout',
          }),
        }),
      }),
      {
        publishGameState: true,
      },
    );
  });

  it('clears scheduled timers on module shutdown', async () => {
    const { room } = createRoomWithSeatedPlayers(store);

    startMatchWithCurrentSeats(
      room,
      {
        mode: 'gomoku',
        boardSize: 15,
        komi: 0,
        timeControl: {
          mainTimeMs: 0,
          periodTimeMs: 100,
          periods: 1,
        },
      },
      dependencies,
    );

    service.refresh(room);
    service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(150);

    expect(room.match?.state.phase).toBe('playing');
    expect(realtime.broadcastMutationResult).not.toHaveBeenCalled();
  });

  it('sweeps timers for rooms that were pruned from the store', async () => {
    const { room } = createRoomWithSeatedPlayers(store);
    const clearSpy = vi.spyOn(service, 'clear');

    startMatchWithCurrentSeats(
      room,
      {
        mode: 'gomoku',
        boardSize: 15,
        komi: 0,
        timeControl: {
          mainTimeMs: 0,
          periodTimeMs: 100,
          periods: 1,
        },
      },
      dependencies,
    );

    service.refresh(room);
    store.rooms.delete(room.id);
    service.sweepStaleRooms();
    await vi.advanceTimersByTimeAsync(150);

    expect(clearSpy).toHaveBeenCalledWith(room.id);
    expect(room.match?.state.phase).toBe('playing');
    expect(realtime.broadcastMutationResult).not.toHaveBeenCalled();
  });

  function createRoomWithSeatedPlayers(store: RoomsStore): {
    room: RoomRecord;
    host: ParticipantRecord;
    guest: ParticipantRecord;
  } {
    const createdAt = '2026-04-20T00:00:00.000Z';
    const host = store.createParticipant('Host', true, createdAt);
    const guest = store.createParticipant('Guest', false, createdAt);
    const room = store.createRoomRecord(host, createdAt);

    room.participants.set(guest.id, guest);
    room.tokenIndex.set(guest.token, guest.id);
    store.rooms.set(room.id, room);
    host.seat = 'black';
    guest.seat = 'white';

    return { room, host, guest };
  }
});
