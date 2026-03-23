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
      lobbyService.claimSeat(liveHost.roomId, liveHost.participantToken, 'black');
      lobbyService.claimSeat(liveHost.roomId, liveGuest.participantToken, 'white');
      lobbyService.startMatch(liveHost.roomId, liveHost.participantToken, {
        mode: 'gomoku',
        boardSize: 15,
      });

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
      lobbyService.claimSeat(readyHost.roomId, readyHost.participantToken, 'black');
      lobbyService.claimSeat(readyHost.roomId, readyGuest.participantToken, 'white');

      vi.setSystemTime(new Date('2026-03-20T00:00:04.000Z'));
      const waitingOlder = lobbyService.createRoom('Host Waiting Older', 'create:wait-1');
      lobbyService.connectParticipantSocket(
        waitingOlder.roomId,
        waitingOlder.participantToken,
        'waiting-older-socket'
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:05.000Z'));
      const waitingNewer = lobbyService.createRoom('Host Waiting Newer', 'create:wait-2');
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

    service.claimSeat(host.roomId, host.participantToken, 'black');
    service.claimSeat(host.roomId, guest.participantToken, 'white');
    service.startMatch(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    expect(() =>
      service.releaseSeat(host.roomId, host.participantToken)
    ).toThrow(BadRequestException);
    expect(() =>
      service.claimSeat(host.roomId, guest.participantToken, 'black')
    ).toThrow(BadRequestException);
  });
});
