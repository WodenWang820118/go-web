import { BadRequestException } from '@nestjs/common';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsModerationService } from './rooms-moderation.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { RoomsLifecycleService } from '../rooms-lifecycle/rooms-lifecycle.service';

describe('RoomsModerationService', () => {
  let lifecycle: RoomsLifecycleService;
  let moderation: RoomsModerationService;

  beforeEach(() => {
    const roomsErrors = new RoomsErrorsService();
    const store = new RoomsStore(roomsErrors);
    const snapshotMapper = new RoomsSnapshotMapper(store);

    lifecycle = new RoomsLifecycleService(store, snapshotMapper, roomsErrors);
    moderation = new RoomsModerationService(store, snapshotMapper, roomsErrors);
  });

  afterEach(() => {
    lifecycle.onModuleDestroy();
  });

  it('mutes and unmutes a spectator', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const spectator = lifecycle.joinRoom(
      host.roomId,
      'Watcher',
      undefined,
      'join:test',
    );

    const muted = moderation.muteParticipant(
      host.roomId,
      host.participantToken,
      spectator.participantId,
    );
    const unmuted = moderation.unmuteParticipant(
      host.roomId,
      host.participantToken,
      spectator.participantId,
    );

    expect(
      muted.snapshot.participants.find(
        (participant) => participant.participantId === spectator.participantId,
      )?.muted,
    ).toBe(true);
    expect(
      unmuted.snapshot.participants.find(
        (participant) => participant.participantId === spectator.participantId,
      )?.muted,
    ).toBe(false);
  });

  it('disconnects every spectator socket when kicking a participant', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const spectator = lifecycle.joinRoom(
      host.roomId,
      'Watcher',
      undefined,
      'join:test',
    );

    lifecycle.connectParticipantSocket(
      host.roomId,
      spectator.participantToken,
      'spectator-1',
    );
    lifecycle.connectParticipantSocket(
      host.roomId,
      spectator.participantToken,
      'spectator-2',
    );

    const kicked = moderation.kickParticipant(
      host.roomId,
      host.participantToken,
      spectator.participantId,
    );

    expect(kicked.kickedSocketIds).toEqual(
      expect.arrayContaining(['spectator-1', 'spectator-2']),
    );
    expect(
      kicked.snapshot.participants.some(
        (participant) => participant.participantId === spectator.participantId,
      ),
    ).toBe(false);
  });

  it('does not allow the host to be muted', () => {
    const host = lifecycle.createRoom('Host', 'create:test');

    expect(() =>
      moderation.muteParticipant(
        host.roomId,
        host.participantToken,
        host.participantId,
      ),
    ).toThrow(BadRequestException);
  });
});
