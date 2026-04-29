import {
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import {
  DEFAULT_GO_RULE_OPTIONS,
  GO_AREA_AGREEMENT_RULESET,
  GO_DIGITAL_NIGIRI_OPENING,
  GOMOKU_FREE_OPENING,
  GOMOKU_STANDARD_EXACT_FIVE_RULESET,
} from '@gx/go/domain';
import { vi } from 'vitest';

import {
  createRoomsServicesTestContext,
  finishGomokuMatch,
} from './test-fixtures';

describe('rooms services composition', () => {
  let context: ReturnType<typeof createRoomsServicesTestContext>;

  beforeEach(() => {
    context = createRoomsServicesTestContext();
  });

  afterEach(() => {
    context.destroy();
  });

  it('auto-starts once both seats are filled and uses the saved next-match settings', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = context.lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    context.match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    context.match.claimSeat(host.roomId, host.participantToken, 'black');
    const started = context.match.claimSeat(
      host.roomId,
      guest.participantToken,
      'white',
    );

    expect(started.snapshot.nextMatchSettings).toEqual({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
      openingRule: GOMOKU_FREE_OPENING,
      timeControl: null,
    });
    expect(started.snapshot.match?.state.phase).toBe('playing');
    expect(started.snapshot.match?.settings.players.black).toBe('Host');
    expect(started.snapshot.match?.settings.players.white).toBe('Guest');
  });

  it('resolves hosted Go nigiri before starting with assigned colors', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test');
    const guest = context.lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    const pending = guest;
    const room = context.store.getRoomRecord(host.roomId);

    expect(pending.snapshot.match).toBeNull();
    expect(pending.snapshot.nigiri).toMatchObject({
      status: 'pending',
      guesser: 'white',
    });
    expect(pending.snapshot.nextMatchSettings).toMatchObject({
      mode: 'go',
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      goRules: DEFAULT_GO_RULE_OPTIONS,
      timeControl: {
        type: 'byo-yomi',
        mainTimeMs: 30 * 60 * 1000,
        periodTimeMs: 30 * 1000,
        periods: 3,
      },
    });

    room.nigiriSecret = {
      parity: 'odd',
      nonce: 'nonce',
    };
    const started = context.match.applyGameCommand(
      host.roomId,
      guest.participantToken,
      { type: 'nigiri-guess', guess: 'odd' },
    );

    expect(started.snapshot.nigiri).toMatchObject({
      status: 'resolved',
      guesser: 'white',
      guess: 'odd',
      parity: 'odd',
      assignedBlack: 'white',
    });
    expect(started.snapshot.seatState).toEqual({
      black: guest.participantId,
      white: host.participantId,
    });
    expect(started.snapshot.match?.settings.players).toEqual({
      black: 'Guest',
      white: 'Host',
    });
    expect(started.snapshot.match?.state.phase).toBe('playing');
  });

  it('keeps hosted Go pending nigiri when the host starts again', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test');
    const guest = context.lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    const pending = guest;
    const duplicateStart = context.match.startMatch(
      host.roomId,
      host.participantToken,
      {
        mode: 'go',
        boardSize: 19,
      },
    );

    expect(pending.snapshot.nigiri).toMatchObject({
      status: 'pending',
      guesser: 'white',
    });
    expect(duplicateStart.notice?.message.key).toBe(
      'room.notice.nigiri_started',
    );
    expect(duplicateStart.notice?.message.params).toEqual({
      player: { key: 'common.player.white' },
    });
    expect(duplicateStart.snapshot.match).toBeNull();
    expect(duplicateStart.snapshot.nigiri).toEqual(pending.snapshot.nigiri);
    expect(duplicateStart.snapshot.seatState).toEqual(
      pending.snapshot.seatState,
    );
  });

  it('rejects game commands from spectators', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = context.lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );
    const spectator = context.lifecycle.joinRoom(
      host.roomId,
      'Watcher',
      undefined,
      'join:test',
    );

    context.match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });
    context.match.claimSeat(host.roomId, host.participantToken, 'black');
    context.match.claimSeat(host.roomId, guest.participantToken, 'white');

    expect(() =>
      context.match.applyGameCommand(host.roomId, spectator.participantToken, {
        type: 'place',
        point: { x: 7, y: 7 },
      }),
    ).toThrow(ForbiddenException);
  });

  it('preserves hosted match state when a guest reconnects with the same token', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = context.lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    context.match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });
    context.match.claimSeat(host.roomId, host.participantToken, 'black');
    context.match.claimSeat(host.roomId, guest.participantToken, 'white');
    context.match.applyGameCommand(host.roomId, host.participantToken, {
      type: 'place',
      point: { x: 7, y: 7 },
    });
    context.match.applyGameCommand(host.roomId, guest.participantToken, {
      type: 'place',
      point: { x: 7, y: 8 },
    });
    context.match.applyGameCommand(host.roomId, host.participantToken, {
      type: 'place',
      point: { x: 8, y: 7 },
    });
    context.lifecycle.connectParticipantSocket(
      host.roomId,
      guest.participantToken,
      'guest-socket-1',
    );
    context.lifecycle.disconnectSocket('guest-socket-1');

    const resumed = context.lifecycle.joinRoom(
      host.roomId,
      'Guest',
      guest.participantToken,
      'join:test',
    );
    const snapshot = context.lifecycle.connectParticipantSocket(
      host.roomId,
      resumed.participantToken,
      'guest-socket-2',
    );

    expect(resumed.resumed).toBe(true);
    expect(resumed.participantId).toBe(guest.participantId);
    expect(snapshot.match?.state.moveHistory).toHaveLength(3);
    expect(snapshot.match?.state.nextPlayer).toBe('white');
    expect(snapshot.match?.state.board[7][7]).toBe('black');
    expect(snapshot.match?.state.board[8][7]).toBe('white');
    expect(snapshot.match?.state.board[7][8]).toBe('black');
  });

  it('lets the host mute and kick spectators', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test');
    const spectator = context.lifecycle.joinRoom(
      host.roomId,
      'Watcher',
      undefined,
      'join:test',
    );

    const muted = context.moderation.muteParticipant(
      host.roomId,
      host.participantToken,
      spectator.participantId,
    );

    expect(
      muted.snapshot.participants.find(
        (participant) => participant.participantId === spectator.participantId,
      )?.muted,
    ).toBe(true);

    const kicked = context.moderation.kickParticipant(
      host.roomId,
      host.participantToken,
      spectator.participantId,
    );

    expect(
      kicked.snapshot.participants.some(
        (participant) => participant.participantId === spectator.participantId,
      ),
    ).toBe(false);
  });

  it('throttles chat spam', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test');

    for (let index = 0; index < 5; index += 1) {
      context.chat.sendChatMessage(
        host.roomId,
        host.participantToken,
        `Hello ${index}`,
      );
    }

    expect(() =>
      context.chat.sendChatMessage(
        host.roomId,
        host.participantToken,
        'Too much',
      ),
    ).toThrow(HttpException);
  });

  it('lists live, ready, and waiting rooms for the public lobby', () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));
      const liveHost = context.lifecycle.createRoom(
        'Host Live',
        'create:live',
        {
          mode: 'gomoku',
          boardSize: 15,
        },
      );
      context.lifecycle.connectParticipantSocket(
        liveHost.roomId,
        liveHost.participantToken,
        'live-host-socket',
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:01.000Z'));
      const liveGuest = context.lifecycle.joinRoom(
        liveHost.roomId,
        'Guest Live',
        undefined,
        'join:live',
      );
      context.lifecycle.connectParticipantSocket(
        liveHost.roomId,
        liveGuest.participantToken,
        'live-guest-socket',
      );
      context.match.updateNextMatchSettings(
        liveHost.roomId,
        liveHost.participantToken,
        {
          mode: 'gomoku',
          boardSize: 15,
        },
      );
      context.match.claimSeat(
        liveHost.roomId,
        liveHost.participantToken,
        'black',
      );
      context.match.claimSeat(
        liveHost.roomId,
        liveGuest.participantToken,
        'white',
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:02.000Z'));
      const readyHost = context.lifecycle.createRoom(
        'Host Ready',
        'create:ready',
        {
          mode: 'gomoku',
          boardSize: 15,
        },
      );
      context.lifecycle.connectParticipantSocket(
        readyHost.roomId,
        readyHost.participantToken,
        'ready-host-socket',
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:03.000Z'));
      const readyGuest = context.lifecycle.joinRoom(
        readyHost.roomId,
        'Guest Ready',
        undefined,
        'join:ready',
      );
      const readySpectator = context.lifecycle.joinRoom(
        readyHost.roomId,
        'Watcher Ready',
        undefined,
        'join:ready',
      );
      context.lifecycle.connectParticipantSocket(
        readyHost.roomId,
        readyGuest.participantToken,
        'ready-guest-socket',
      );
      context.lifecycle.connectParticipantSocket(
        readyHost.roomId,
        readySpectator.participantToken,
        'ready-spectator-socket',
      );
      context.match.updateNextMatchSettings(
        readyHost.roomId,
        readyHost.participantToken,
        {
          mode: 'gomoku',
          boardSize: 15,
        },
      );
      context.match.claimSeat(
        readyHost.roomId,
        readyHost.participantToken,
        'black',
      );
      context.match.claimSeat(
        readyHost.roomId,
        readyGuest.participantToken,
        'white',
      );
      finishGomokuMatch(
        context.match,
        readyHost.roomId,
        readyHost.participantToken,
        readyGuest.participantToken,
      );
      context.match.respondToRematch(
        readyHost.roomId,
        readyHost.participantToken,
        false,
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:04.000Z'));
      const waitingOlder = context.lifecycle.createRoom(
        'Host Waiting Older',
        'create:wait-1',
      );
      context.lifecycle.connectParticipantSocket(
        waitingOlder.roomId,
        waitingOlder.participantToken,
        'waiting-older-socket',
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:05.000Z'));
      const waitingNewer = context.lifecycle.createRoom(
        'Host Waiting Newer',
        'create:wait-2',
      );
      context.lifecycle.connectParticipantSocket(
        waitingNewer.roomId,
        waitingNewer.participantToken,
        'waiting-newer-socket',
      );

      vi.setSystemTime(new Date('2026-03-20T00:00:06.000Z'));
      context.lifecycle.createRoom('Host Offline', 'create:offline');

      const response = context.lifecycle.listRooms();

      expect(response.rooms.map((room) => room.roomId)).toEqual([
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
        ]),
      );
      expect(response.onlineParticipants).toEqual([
        expect.objectContaining({
          displayName: 'Host Live',
          roomId: liveHost.roomId,
          seat: 'black',
          isHost: true,
          activity: 'playing',
        }),
        expect.objectContaining({
          displayName: 'Guest Live',
          roomId: liveHost.roomId,
          seat: 'white',
          isHost: false,
          activity: 'playing',
        }),
        expect.objectContaining({
          displayName: 'Host Ready',
          roomId: readyHost.roomId,
          seat: 'black',
          isHost: true,
          activity: 'seated',
        }),
        expect.objectContaining({
          displayName: 'Guest Ready',
          roomId: readyHost.roomId,
          seat: 'white',
          isHost: false,
          activity: 'seated',
        }),
        expect.objectContaining({
          displayName: 'Watcher Ready',
          roomId: readyHost.roomId,
          seat: null,
          isHost: false,
          activity: 'watching',
        }),
        expect.objectContaining({
          displayName: 'Host Waiting Newer',
          roomId: waitingNewer.roomId,
          seat: null,
          isHost: true,
          activity: 'watching',
        }),
        expect.objectContaining({
          displayName: 'Host Waiting Older',
          roomId: waitingOlder.roomId,
          seat: null,
          isHost: true,
          activity: 'watching',
        }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prevents seat changes while a hosted match is active', () => {
    const host = context.lifecycle.createRoom('Host', 'create:test', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = context.lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    context.match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });
    context.match.claimSeat(host.roomId, host.participantToken, 'black');
    context.match.claimSeat(host.roomId, guest.participantToken, 'white');

    expect(() =>
      context.match.releaseSeat(host.roomId, host.participantToken),
    ).toThrow(BadRequestException);
    expect(() =>
      context.match.claimSeat(host.roomId, guest.participantToken, 'black'),
    ).toThrow(BadRequestException);
  });
});
