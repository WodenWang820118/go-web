import { ForbiddenException, HttpException } from '@nestjs/common';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(() => {
    service = new RoomsService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('creates rooms and lets the host start a match once seats are filled', () => {
    const host = service.createRoom('Host', 'create:test');
    const guest = service.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    service.claimSeat(host.roomId, host.participantToken, 'black');
    service.claimSeat(host.roomId, guest.participantToken, 'white');

    const started = service.startMatch(host.roomId, host.participantToken, {
      mode: 'go',
      boardSize: 9,
      komi: 6.5,
    });

    expect(started.snapshot.match?.settings.mode).toBe('go');
    expect(started.snapshot.match?.settings.players.black).toBe('Host');
    expect(started.snapshot.match?.settings.players.white).toBe('Guest');
  });

  it('rejects game commands from spectators', () => {
    const host = service.createRoom('Host', 'create:test');
    const guest = service.joinRoom(host.roomId, 'Guest', undefined, 'join:test');
    const spectator = service.joinRoom(host.roomId, 'Watcher', undefined, 'join:test');

    service.claimSeat(host.roomId, host.participantToken, 'black');
    service.claimSeat(host.roomId, guest.participantToken, 'white');
    service.startMatch(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    expect(() =>
      service.applyGameCommand(host.roomId, spectator.participantToken, {
        type: 'place',
        point: { x: 7, y: 7 },
      })
    ).toThrow(ForbiddenException);
  });

  it('lets the host mute and kick spectators', () => {
    const host = service.createRoom('Host', 'create:test');
    const spectator = service.joinRoom(host.roomId, 'Watcher', undefined, 'join:test');

    const muted = service.muteParticipant(
      host.roomId,
      host.participantToken,
      spectator.participantId
    );

    expect(
      muted.snapshot.participants.find(
        participant => participant.participantId === spectator.participantId
      )?.muted
    ).toBe(true);

    const kicked = service.kickParticipant(
      host.roomId,
      host.participantToken,
      spectator.participantId
    );

    expect(
      kicked.snapshot.participants.some(
        participant => participant.participantId === spectator.participantId
      )
    ).toBe(false);
  });

  it('throttles chat spam', () => {
    const host = service.createRoom('Host', 'create:test');

    for (let index = 0; index < 5; index += 1) {
      service.sendChatMessage(host.roomId, host.participantToken, `Hello ${index}`);
    }

    expect(() =>
      service.sendChatMessage(host.roomId, host.participantToken, 'Too much')
    ).toThrow(HttpException);
  });
});
