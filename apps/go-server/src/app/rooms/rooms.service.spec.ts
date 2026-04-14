import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { vi } from 'vitest';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(() => {
    service = new RoomsService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('auto-starts once both seats are filled and uses the saved next-match settings', () => {
    const host = service.createRoom('Host', 'create:test');
    const guest = service.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    service.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    service.claimSeat(host.roomId, host.participantToken, 'black');
    const started = service.claimSeat(host.roomId, guest.participantToken, 'white');

    expect(started.snapshot.nextMatchSettings).toEqual({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
    });
    expect(started.snapshot.match?.state.phase).toBe('playing');
    expect(started.snapshot.match?.settings.players.black).toBe('Host');
    expect(started.snapshot.match?.settings.players.white).toBe('Guest');
  });

  it('rejects game commands from spectators', () => {
    const host = service.createRoom('Host', 'create:test');
    const guest = service.joinRoom(host.roomId, 'Guest', undefined, 'join:test');
    const spectator = service.joinRoom(host.roomId, 'Watcher', undefined, 'join:test');

    service.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });
    service.claimSeat(host.roomId, host.participantToken, 'black');
    service.claimSeat(host.roomId, guest.participantToken, 'white');

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

  it('lists live, ready, and waiting rooms for the public lobby', () => {
    vi.useFakeTimers();

    const lobbyService = new RoomsService();

    try {
      vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));
      const liveHost = lobbyService.createRoom('Host Live', 'create:live');
      lobbyService.connectParticipantSocket(
        liveHost.roomId,
        liveHost.participantToken,
        'live-host-socket'
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:01.000Z'));
      const liveGuest = lobbyService.joinRoom(
        liveHost.roomId,
        'Guest Live',
        undefined,
        'join:live'
      );
      lobbyService.connectParticipantSocket(
        liveHost.roomId,
        liveGuest.participantToken,
        'live-guest-socket'
      );
      lobbyService.updateNextMatchSettings(
        liveHost.roomId,
        liveHost.participantToken,
        {
          mode: 'gomoku',
          boardSize: 15,
        }
      );
      lobbyService.claimSeat(liveHost.roomId, liveHost.participantToken, 'black');
      lobbyService.claimSeat(liveHost.roomId, liveGuest.participantToken, 'white');

      vi.setSystemTime(new Date('2026-03-20T00:00:02.000Z'));
      const readyHost = lobbyService.createRoom('Host Ready', 'create:ready');
      lobbyService.connectParticipantSocket(
        readyHost.roomId,
        readyHost.participantToken,
        'ready-host-socket'
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:03.000Z'));
      const readyGuest = lobbyService.joinRoom(
        readyHost.roomId,
        'Guest Ready',
        undefined,
        'join:ready'
      );
      const readySpectator = lobbyService.joinRoom(
        readyHost.roomId,
        'Watcher Ready',
        undefined,
        'join:ready'
      );
      lobbyService.connectParticipantSocket(
        readyHost.roomId,
        readyGuest.participantToken,
        'ready-guest-socket'
      );
      lobbyService.connectParticipantSocket(
        readyHost.roomId,
        readySpectator.participantToken,
        'ready-spectator-socket'
      );
      lobbyService.updateNextMatchSettings(
        readyHost.roomId,
        readyHost.participantToken,
        {
          mode: 'gomoku',
          boardSize: 15,
        }
      );
      lobbyService.claimSeat(readyHost.roomId, readyHost.participantToken, 'black');
      lobbyService.claimSeat(readyHost.roomId, readyGuest.participantToken, 'white');
      finishHostedGomokuMatch(
        lobbyService,
        readyHost.roomId,
        readyHost.participantToken,
        readyGuest.participantToken
      );
      lobbyService.respondToRematch(
        readyHost.roomId,
        readyHost.participantToken,
        false
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:04.000Z'));
      const waitingOlder = lobbyService.createRoom(
        'Host Waiting Older',
        'create:wait-1'
      );
      lobbyService.connectParticipantSocket(
        waitingOlder.roomId,
        waitingOlder.participantToken,
        'waiting-older-socket'
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:05.000Z'));
      const waitingNewer = lobbyService.createRoom(
        'Host Waiting Newer',
        'create:wait-2'
      );
      lobbyService.connectParticipantSocket(
        waitingNewer.roomId,
        waitingNewer.participantToken,
        'waiting-newer-socket'
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:06.000Z'));
      lobbyService.createRoom('Host Offline', 'create:offline');

      const response = lobbyService.listRooms();

      expect(response.rooms.map(room => room.roomId)).toEqual([
        liveHost.roomId,
        readyHost.roomId,
        waitingNewer.roomId,
        waitingOlder.roomId,
      ]);
      expect(response.rooms).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            roomId: liveHost.roomId,
            hostDisplayName: 'Host Live',
            status: 'live',
            mode: 'gomoku',
            boardSize: 15,
            players: {
              black: 'Host Live',
              white: 'Guest Live',
            },
            participantCount: 2,
            onlineCount: 2,
            spectatorCount: 0,
          }),
          expect.objectContaining({
            roomId: readyHost.roomId,
            hostDisplayName: 'Host Ready',
            status: 'ready',
            mode: 'gomoku',
            boardSize: 15,
            players: {
              black: 'Host Ready',
              white: 'Guest Ready',
            },
            participantCount: 3,
            onlineCount: 3,
            spectatorCount: 1,
          }),
          expect.objectContaining({
            roomId: waitingNewer.roomId,
            hostDisplayName: 'Host Waiting Newer',
            status: 'waiting',
            mode: 'go',
            boardSize: 19,
            players: {
              black: null,
              white: null,
            },
            participantCount: 1,
            onlineCount: 1,
            spectatorCount: 1,
          }),
        ])
      );
    } finally {
      lobbyService.onModuleDestroy();
      vi.useRealTimers();
    }
  });

  it('prevents seat changes while a hosted match is active', () => {
    const host = service.createRoom('Host', 'create:test');
    const guest = service.joinRoom(host.roomId, 'Guest', undefined, 'join:test');

    service.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });
    service.claimSeat(host.roomId, host.participantToken, 'black');
    service.claimSeat(host.roomId, guest.participantToken, 'white');

    expect(() =>
      service.releaseSeat(host.roomId, host.participantToken)
    ).toThrow(BadRequestException);
    expect(() =>
      service.claimSeat(host.roomId, guest.participantToken, 'black')
    ).toThrow(BadRequestException);
  });
});

function finishHostedGomokuMatch(
  service: RoomsService,
  roomId: string,
  hostToken: string,
  guestToken: string
): void {
  const sequence = [
    { token: hostToken, point: { x: 0, y: 0 } },
    { token: guestToken, point: { x: 0, y: 1 } },
    { token: hostToken, point: { x: 1, y: 0 } },
    { token: guestToken, point: { x: 1, y: 1 } },
    { token: hostToken, point: { x: 2, y: 0 } },
    { token: guestToken, point: { x: 2, y: 1 } },
    { token: hostToken, point: { x: 3, y: 0 } },
    { token: guestToken, point: { x: 3, y: 1 } },
    { token: hostToken, point: { x: 4, y: 0 } },
  ];

  for (const move of sequence) {
    service.applyGameCommand(roomId, move.token, {
      type: 'place',
      point: move.point,
    });
  }
}
