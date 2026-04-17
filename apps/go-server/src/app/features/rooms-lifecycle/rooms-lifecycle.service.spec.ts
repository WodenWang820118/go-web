import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsLifecycleService } from './rooms-lifecycle.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { ForbiddenException } from '@nestjs/common';

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
