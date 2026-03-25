import { ForbiddenException } from '@nestjs/common';
import { RoomsLifecycleService } from './rooms-lifecycle.service';
import { RoomsMatchService } from './rooms-match.service';
import { RoomsSnapshotMapper } from './rooms.snapshot.mapper';
import { RoomsStore } from './rooms.store';

describe('RoomsMatchService', () => {
  let lifecycle: RoomsLifecycleService;
  let match: RoomsMatchService;

  beforeEach(() => {
    const store = new RoomsStore();
    const snapshotMapper = new RoomsSnapshotMapper(store);

    lifecycle = new RoomsLifecycleService(store, snapshotMapper);
    match = new RoomsMatchService(store, snapshotMapper);
  });

  afterEach(() => {
    lifecycle.onModuleDestroy();
  });

  it('starts a match after both seats are claimed', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    match.claimSeat(host.roomId, host.participantToken, 'black');
    match.claimSeat(host.roomId, guest.participantToken, 'white');

    const started = match.startMatch(host.roomId, host.participantToken, {
      mode: 'go',
      boardSize: 9,
      komi: 6.5,
    });

    expect(started.snapshot.match?.settings.players.black).toBe('Host');
    expect(started.snapshot.match?.settings.players.white).toBe('Guest');
  });

  it('rejects moves from the wrong player turn', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    match.claimSeat(host.roomId, host.participantToken, 'black');
    match.claimSeat(host.roomId, guest.participantToken, 'white');
    match.startMatch(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    expect(() =>
      match.applyGameCommand(host.roomId, guest.participantToken, {
        type: 'place',
        point: { x: 7, y: 7 },
      })
    ).toThrow(ForbiddenException);
  });
});
