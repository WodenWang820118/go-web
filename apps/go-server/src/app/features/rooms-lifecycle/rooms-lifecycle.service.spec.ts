import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsLifecycleService } from './rooms-lifecycle.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import {
  CREATE_ATTEMPTS_PER_WINDOW,
  ROOM_IDLE_TTL_MS,
  THROTTLE_WINDOW_MS,
} from '../../core/rooms-config/rooms.constants';
import { vi } from 'vitest';

describe('RoomsLifecycleService', () => {
  let lifecycle: RoomsLifecycleService;

  beforeEach(() => {
    const roomsErrors = new RoomsErrorsService();
    const store = new RoomsStore(roomsErrors);
    const snapshotMapper = new RoomsSnapshotMapper(store);

    lifecycle = new RoomsLifecycleService(store, snapshotMapper, roomsErrors);
  });

  afterEach(() => {
    lifecycle.onModuleDestroy();
  });

  describe('createRoom throttling', () => {
    const requesterKey = 'create:throttle-test';

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('allows up to the create-attempt limit within the window', () => {
      for (let i = 0; i < CREATE_ATTEMPTS_PER_WINDOW; i++) {
        expect(() =>
          lifecycle.createRoom(`Room ${i + 1}`, requesterKey)
        ).not.toThrow();
      }
    });

    it('throttles create attempts after the limit is reached', () => {
      for (let i = 0; i < CREATE_ATTEMPTS_PER_WINDOW; i++) {
        lifecycle.createRoom(`Room ${i + 1}`, requesterKey);
      }

      expectCreateRoomThrottled(
        lifecycle,
        `Room ${CREATE_ATTEMPTS_PER_WINDOW + 1}`,
        requesterKey
      );
    });

    it('isolates throttling between different requesters', () => {
      const requesterA = 'create:throttle-test-a';
      const requesterB = 'create:throttle-test-b';

      for (let i = 0; i < CREATE_ATTEMPTS_PER_WINDOW; i++) {
        lifecycle.createRoom(`Room ${i + 1}`, requesterA);
      }

      expectCreateRoomThrottled(
        lifecycle,
        `Room ${CREATE_ATTEMPTS_PER_WINDOW + 1}`,
        requesterA
      );

      expect(() =>
        lifecycle.createRoom('Requester B room', requesterB)
      ).not.toThrow();
    });

    it('resets the throttle window after the time limit expires', () => {
      for (let i = 0; i < CREATE_ATTEMPTS_PER_WINDOW; i++) {
        lifecycle.createRoom(`Room ${i + 1}`, requesterKey);
      }

      expectCreateRoomThrottled(
        lifecycle,
        `Room ${CREATE_ATTEMPTS_PER_WINDOW + 1}`,
        requesterKey
      );

      vi.advanceTimersByTime(THROTTLE_WINDOW_MS - 1);

      expectCreateRoomThrottled(
        lifecycle,
        `Room ${CREATE_ATTEMPTS_PER_WINDOW + 2}`,
        requesterKey
      );

      vi.advanceTimersByTime(2);

      expect(() =>
        lifecycle.createRoom(
          `Room ${CREATE_ATTEMPTS_PER_WINDOW + 3}`,
          requesterKey
        )
      ).not.toThrow();
    });
  });

  describe('room pruning', () => {
    let store: RoomsStore;

    beforeEach(() => {
      const roomsErrors = new RoomsErrorsService();
      store = new RoomsStore(roomsErrors);
      const snapshotMapper = new RoomsSnapshotMapper(store);
      lifecycle = new RoomsLifecycleService(store, snapshotMapper, roomsErrors);

      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      lifecycle.onModuleDestroy();
    });

    it('prunes offline rooms that were created but never joined via socket', () => {
      vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));
      const host = lifecycle.createRoom('Never Joined', 'create:test');
      const roomId = host.roomId;

      expect(lifecycle.getRoom(roomId)).toBeDefined();

      vi.advanceTimersByTime(ROOM_IDLE_TTL_MS + 1000);
      store.pruneExpiredRooms();

      expect(() => lifecycle.getRoom(roomId)).toThrow();
    });

    it('retains rooms that have online participants even if past the TTL', () => {
      vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));
      const host = lifecycle.createRoom('Active Room', 'create:test');
      lifecycle.connectParticipantSocket(host.roomId, host.participantToken, 'socket-1');

      vi.advanceTimersByTime(ROOM_IDLE_TTL_MS + 1000);
      store.pruneExpiredRooms();

      expect(lifecycle.getRoom(host.roomId)).toBeDefined();
    });

    it('prunes rooms that became empty and reached the TTL', () => {
      vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));
      const host = lifecycle.createRoom('Was Active', 'create:test');
      lifecycle.connectParticipantSocket(host.roomId, host.participantToken, 'socket-1');

      // Room becomes empty
      lifecycle.disconnectSocket('socket-1');

      vi.advanceTimersByTime(ROOM_IDLE_TTL_MS + 1000);
      store.pruneExpiredRooms();

      expect(() => lifecycle.getRoom(host.roomId)).toThrow();
    });
  });

  it('reuses an existing participant token when rejoining a room', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    const resumed = lifecycle.joinRoom(
      host.roomId,
      'Guest Renamed',
      guest.participantToken,
      'join:test'
    );

    expect(resumed.resumed).toBe(true);
    expect(resumed.participantId).toBe(guest.participantId);
    expect(
      resumed.snapshot.participants.find(
        participant => participant.participantId === guest.participantId
      )?.displayName
    ).toBe('Guest Renamed');
  });

  it('suffixes duplicate display names for different participants', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(host.roomId, 'Host', undefined, 'join:test');

    expect(
      guest.snapshot.participants.find(
        participant => participant.participantId === guest.participantId
      )?.displayName
    ).toBe('Host (2)');
  });

  it('tracks socket presence across connect and disconnect', () => {
    const host = lifecycle.createRoom('Host', 'create:test');

    const connected = lifecycle.connectParticipantSocket(
      host.roomId,
      host.participantToken,
      'socket-1'
    );

    expect(connected.participants[0]?.online).toBe(true);

    const disconnected = lifecycle.disconnectSocket('socket-1');

    expect(disconnected?.participants[0]?.online).toBe(false);
  });

  it('lets the host close the room and removes it immediately', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    lifecycle.connectParticipantSocket(host.roomId, host.participantToken, 'socket-host');
    lifecycle.connectParticipantSocket(host.roomId, guest.participantToken, 'socket-guest');

    const closed = lifecycle.closeRoom(host.roomId, host.participantToken);

    expect(closed).toMatchObject({
      roomId: host.roomId,
      socketIds: expect.arrayContaining(['socket-host', 'socket-guest']),
      event: {
        roomId: host.roomId,
      },
    });
    expect(() => lifecycle.getRoom(host.roomId)).toThrow();
    expect(lifecycle.listRooms()).toEqual({
      rooms: [],
      onlineParticipants: [],
    });
  });

  it('rejects close-room requests from non-host participants', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    expect(() =>
      lifecycle.closeRoom(host.roomId, guest.participantToken)
    ).toThrow(ForbiddenException);
  });
});

function expectCreateRoomThrottled(
  lifecycle: RoomsLifecycleService,
  displayName: string,
  requesterKey: string
): void {
  try {
    lifecycle.createRoom(displayName, requesterKey);
    throw new Error('Expected createRoom to throw a 429 throttle error');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
