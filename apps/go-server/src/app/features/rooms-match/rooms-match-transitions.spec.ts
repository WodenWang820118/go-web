import {
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { boardHash, cloneBoard, createBoard, setCell } from '@gx/go/domain';
import { vi } from 'vitest';
import type {
  ParticipantRecord,
  RoomRecord,
} from '../../contracts/rooms.types';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from '../../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { createHostedRematchState } from './rooms-match-policy';
import {
  applyHostedGameCommand,
  maybeStartNextMatch,
  startMatchWithCurrentSeats,
  type RoomsMatchTransitionDependencies,
} from './rooms-match-transitions';

describe('rooms-match-transitions', () => {
  let store: RoomsStore;
  let roomsErrors: RoomsErrorsService;
  let rulesEngines: RoomsRulesEngineService;
  let dependencies: RoomsMatchTransitionDependencies;

  beforeEach(() => {
    roomsErrors = new RoomsErrorsService();
    store = new RoomsStore(roomsErrors);
    rulesEngines = new RoomsRulesEngineService();
    dependencies = {
      logger: new Logger('rooms-match-transitions.spec'),
      store,
      rulesEngines,
      roomsErrors,
    };
  });

  describe('applyHostedGameCommand', () => {
    it('applies a valid move to the hosted match state', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);
      applyHostedGameCommand(
        room,
        host,
        { type: 'place', point: { x: 0, y: 0 } },
        dependencies,
      );

      expect(room.match?.state.moveHistory).toHaveLength(1);
      expect(room.match?.state.nextPlayer).toBe('white');
    });

    it('advances the hosted clock after a valid move', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);
      vi.spyOn(store, 'timestamp')
        .mockReturnValueOnce('2026-04-20T00:00:00.000Z')
        .mockReturnValueOnce('2026-04-20T00:00:05.000Z')
        .mockReturnValueOnce('2026-04-20T00:00:05.000Z');

      startTimedGomokuMatch(room, dependencies);
      applyHostedGameCommand(
        room,
        host,
        { type: 'place', point: { x: 0, y: 0 } },
        dependencies,
      );

      expect(room.match?.clock).toMatchObject({
        activeColor: 'white',
        lastStartedAt: '2026-04-20T00:00:05.000Z',
        players: {
          black: {
            mainTimeMs: 5_000,
            periodTimeMs: 30_000,
            periodsRemaining: 5,
          },
          white: {
            mainTimeMs: 10_000,
            periodTimeMs: 30_000,
            periodsRemaining: 5,
          },
        },
      });
    });

    it('ignores a delayed move when server-side elapsed time exhausts the clock', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);
      vi.spyOn(store, 'timestamp')
        .mockReturnValueOnce('2026-04-20T00:00:00.000Z')
        .mockReturnValueOnce('2026-04-20T00:00:04.000Z');

      startTimedGomokuMatch(room, dependencies, {
        mainTimeMs: 3_000,
        periodTimeMs: 1_000,
        periods: 1,
      });
      applyHostedGameCommand(
        room,
        host,
        { type: 'place', point: { x: 0, y: 0 } },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('finished');
      expect(room.match?.state.moveHistory).toHaveLength(0);
      expect(room.match?.state.result).toMatchObject({
        winner: 'white',
        reason: 'timeout',
        summary: {
          key: 'game.result.timeout',
        },
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
    });

    it('accepts a move that reaches the server just before timeout', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);
      vi.spyOn(store, 'timestamp')
        .mockReturnValueOnce('2026-04-20T00:00:00.000Z')
        .mockReturnValueOnce('2026-04-20T00:00:03.999Z')
        .mockReturnValueOnce('2026-04-20T00:00:03.999Z');

      startTimedGomokuMatch(room, dependencies, {
        mainTimeMs: 3_000,
        periodTimeMs: 1_000,
        periods: 1,
      });
      applyHostedGameCommand(
        room,
        host,
        { type: 'place', point: { x: 0, y: 0 } },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('playing');
      expect(room.match?.state.moveHistory).toHaveLength(1);
      expect(room.match?.state.nextPlayer).toBe('white');
      expect(room.match?.clock).toMatchObject({
        activeColor: 'white',
        lastStartedAt: '2026-04-20T00:00:03.999Z',
        players: {
          black: {
            mainTimeMs: 0,
            periodTimeMs: 1_000,
            periodsRemaining: 1,
          },
        },
      });
    });

    it('rejects spectator commands while a hosted match is active', () => {
      const { room } = createRoomWithSeatedPlayers(store);
      const spectator = addParticipant(store, room, 'Spectator');

      startGomokuMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(
          room,
          spectator,
          { type: 'place', point: { x: 0, y: 0 } },
          dependencies,
        ),
      ).toThrow(ForbiddenException);
    });

    it('rejects scoring commands when the match is not in scoring phase', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'toggle-dead', point: { x: 0, y: 0 } },
          dependencies,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects score finalization when the match is not in scoring phase', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'finalize-scoring' },
          dependencies,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects scoring confirmation when the match is not in scoring phase', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'confirm-scoring' },
          dependencies,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects scoring disputes when the match is not in scoring phase', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'dispute-scoring' },
          dependencies,
        ),
      ).toThrow(BadRequestException);
    });

    it('resolves pending nigiri and swaps seats when the guesser wins black', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      room.nigiri = {
        status: 'pending',
        commitment: 'commitment',
        guesser: 'white',
      };
      room.nigiriSecret = {
        parity: 'odd',
        nonce: 'nonce',
      };

      applyHostedGameCommand(
        room,
        guest,
        { type: 'nigiri-guess', guess: 'odd' },
        dependencies,
      );

      expect(room.nigiri).toMatchObject({
        status: 'resolved',
        guesser: 'white',
        guess: 'odd',
        parity: 'odd',
        nonce: 'nonce',
        assignedBlack: 'white',
      });
      expect(host.seat).toBe('white');
      expect(guest.seat).toBe('black');
      expect(room.nigiriSecret).toBeNull();
    });

    it('resolves pending nigiri and keeps seats when the guesser loses', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      room.nigiri = {
        status: 'pending',
        commitment: 'commitment',
        guesser: 'white',
      };
      room.nigiriSecret = {
        parity: 'odd',
        nonce: 'nonce',
      };

      applyHostedGameCommand(
        room,
        guest,
        { type: 'nigiri-guess', guess: 'even' },
        dependencies,
      );

      expect(room.nigiri).toMatchObject({
        status: 'resolved',
        guess: 'even',
        parity: 'odd',
        assignedBlack: 'black',
      });
      expect(host.seat).toBe('black');
      expect(guest.seat).toBe('white');
      expect(room.nigiriSecret).toBeNull();
    });

    it('rejects nigiri guesses from the non-guesser seat', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      room.nigiri = {
        status: 'pending',
        commitment: 'commitment',
        guesser: 'white',
      };
      room.nigiriSecret = {
        parity: 'odd',
        nonce: 'nonce',
      };

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'nigiri-guess', guess: 'odd' },
          dependencies,
        ),
      ).toThrow(ForbiddenException);
    });

    it('rejects nigiri guesses when no pending nigiri is active', () => {
      const { room, guest } = createRoomWithSeatedPlayers(store);

      expect(() =>
        applyHostedGameCommand(
          room,
          guest,
          { type: 'nigiri-guess', guess: 'odd' },
          dependencies,
        ),
      ).toThrow(BadRequestException);

      room.nigiri = {
        status: 'resolved',
        commitment: 'commitment',
        guesser: 'white',
        guess: 'odd',
        parity: 'odd',
        nonce: 'nonce',
        assignedBlack: 'white',
      };

      expect(() =>
        applyHostedGameCommand(
          room,
          guest,
          { type: 'nigiri-guess', guess: 'odd' },
          dependencies,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects pending nigiri guesses when the server secret is missing', () => {
      const { room, guest } = createRoomWithSeatedPlayers(store);

      room.nigiri = {
        status: 'pending',
        commitment: 'commitment',
        guesser: 'white',
      };
      room.nigiriSecret = null;

      expect(() =>
        applyHostedGameCommand(
          room,
          guest,
          { type: 'nigiri-guess', guess: 'odd' },
          dependencies,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects invalid nigiri guess payloads', () => {
      const { room, guest } = createRoomWithSeatedPlayers(store);

      room.nigiri = {
        status: 'pending',
        commitment: 'commitment',
        guesser: 'white',
      };
      room.nigiriSecret = {
        parity: 'odd',
        nonce: 'nonce',
      };

      expect(() =>
        applyHostedGameCommand(
          room,
          guest,
          { type: 'nigiri-guess', guess: 'anything' } as never,
          dependencies,
        ),
      ).toThrow(BadRequestException);
      expect(room.nigiri).toMatchObject({
        status: 'pending',
        guesser: 'white',
      });
      expect(room.nigiriSecret).toEqual({
        parity: 'odd',
        nonce: 'nonce',
      });
    });

    it('rejects moves played out of turn', () => {
      const { room, guest } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(
          room,
          guest,
          { type: 'place', point: { x: 0, y: 0 } },
          dependencies,
        ),
      ).toThrow(ForbiddenException);
    });

    it('rejects stale duplicate moves from the same seated player without changing state', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);
      applyHostedGameCommand(
        room,
        host,
        { type: 'place', point: { x: 7, y: 7 } },
        dependencies,
      );

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'place', point: { x: 8, y: 8 } },
          dependencies,
        ),
      ).toThrow(ForbiddenException);
      expect(room.match?.state.moveHistory).toHaveLength(1);
      expect(room.match?.state.nextPlayer).toBe('white');
      expect(room.match?.state.board[7][7]).toBe('black');
      expect(room.match?.state.board[8][8]).toBeNull();
    });

    it('server-rejects Gomoku pass commands even if a client submits them', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(room, host, { type: 'pass' }, dependencies),
      ).toThrow(BadRequestException);
      expect(room.match?.state.moveHistory).toHaveLength(0);
      expect(room.match?.state.phase).toBe('playing');
    });

    it('server-rejects illegal Go suicide moves even if a client submits them', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);
      const match = room.match;

      if (!match) {
        throw new Error('Expected a started Go match');
      }

      setCell(match.state.board, { x: 1, y: 0 }, 'white');
      setCell(match.state.board, { x: 0, y: 1 }, 'white');
      setCell(match.state.board, { x: 2, y: 1 }, 'white');
      setCell(match.state.board, { x: 1, y: 2 }, 'white');

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'place', point: { x: 1, y: 1 } },
          dependencies,
        ),
      ).toThrow(BadRequestException);
      expect(room.match?.state.moveHistory).toHaveLength(0);
      expect(room.match?.state.board[1][1]).toBeNull();
    });

    it('server-rejects immediate hosted Go ko recaptures', () => {
      const { room, guest } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);

      const beforeKo = createBoard(9);
      setCell(beforeKo, { x: 1, y: 0 }, 'black');
      setCell(beforeKo, { x: 2, y: 0 }, 'white');
      setCell(beforeKo, { x: 0, y: 1 }, 'black');
      setCell(beforeKo, { x: 1, y: 1 }, 'white');
      setCell(beforeKo, { x: 3, y: 1 }, 'white');
      setCell(beforeKo, { x: 1, y: 2 }, 'black');
      setCell(beforeKo, { x: 2, y: 2 }, 'white');

      const afterKo = cloneBoard(beforeKo);
      setCell(afterKo, { x: 1, y: 1 }, null);
      setCell(afterKo, { x: 2, y: 1 }, 'black');

      const match = room.match;

      if (!match) {
        throw new Error('Expected a started Go match');
      }

      room.match = {
        ...match,
        state: {
          ...match.state,
          board: afterKo,
          nextPlayer: 'white',
          previousBoardHashes: [boardHash(beforeKo), boardHash(afterKo)],
        },
      };

      expect(() =>
        applyHostedGameCommand(
          room,
          guest,
          { type: 'place', point: { x: 1, y: 1 } },
          dependencies,
        ),
      ).toThrow(BadRequestException);
      expect(room.match?.state.moveHistory).toHaveLength(0);
      expect(room.match?.state.board[1][1]).toBeNull();
      expect(room.match?.state.board[1][2]).toBe('black');
    });

    it('rejects resign commands submitted for the opposing seat', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);

      expect(() =>
        applyHostedGameCommand(
          room,
          host,
          { type: 'resign', player: 'white' },
          dependencies,
        ),
      ).toThrow(ForbiddenException);
    });

    it('surfaces the rules engine rejection message for invalid moves', () => {
      expect.assertions(2);

      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);
      applyHostedGameCommand(
        room,
        host,
        { type: 'place', point: { x: 0, y: 0 } },
        dependencies,
      );

      try {
        applyHostedGameCommand(
          room,
          guest,
          { type: 'place', point: { x: 0, y: 0 } },
          dependencies,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
          message: {
            key: 'game.error.intersection_occupied',
          },
        });
      }
    });

    it('forwards custom rules engine errors in the bad request payload', () => {
      expect.assertions(2);

      const { room, host } = createRoomWithSeatedPlayers(store);
      const rejectingDependencies: RoomsMatchTransitionDependencies = {
        ...dependencies,
        rulesEngines: {
          get: () =>
            ({
              applyMove: () => ({
                ok: false,
                error: 'custom error message',
                state: getHostedMatch(room).state,
              }),
            }) as ReturnType<RoomsRulesEngineService['get']>,
        } as RoomsRulesEngineService,
      };

      startGomokuMatch(room, dependencies);

      try {
        applyHostedGameCommand(
          room,
          host,
          { type: 'place', point: { x: 0, y: 0 } },
          rejectingDependencies,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
          message: 'custom error message',
        });
      }
    });

    it('creates a rematch gate when a hosted match finishes', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);
      room.autoStartBlockedUntilSeatChange = true;

      startGomokuMatch(room, dependencies);
      applyHostedGameCommand(room, host, { type: 'resign' }, dependencies);

      expect(room.match?.state.phase).toBe('finished');
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
      expect(room.autoStartBlockedUntilSeatChange).toBe(false);
    });

    it('clears resolved nigiri when a hosted match finishes', () => {
      const { room, host } = createRoomWithSeatedPlayers(store);
      room.nigiri = {
        status: 'resolved',
        commitment: 'commitment',
        guesser: 'white',
        guess: 'even',
        parity: 'odd',
        nonce: 'nonce',
        assignedBlack: 'black',
      };

      startGoMatch(room, dependencies);
      expect(room.nigiri?.status).toBe('resolved');

      applyHostedGameCommand(room, host, { type: 'resign' }, dependencies);

      expect(room.match?.state.phase).toBe('finished');
      expect(room.nigiri).toBeNull();
      expect(room.nigiriSecret).toBeNull();
    });

    it('opens hosted Go scoring after two passes without creating a rematch gate', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);
      applyHostedGameCommand(room, host, { type: 'pass' }, dependencies);
      applyHostedGameCommand(room, guest, { type: 'pass' }, dependencies);

      expect(room.match?.state.phase).toBe('scoring');
      expect(room.match?.state.result).toBeNull();
      expect(room.match?.state.scoring?.score.white).toBe(6.5);
      expect(room.rematch).toBeNull();
    });

    it('updates hosted Go scoring when a dead group is toggled', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);

      const board = getHostedMatch(room).state.board;
      setCell(board, { x: 0, y: 0 }, 'black');
      setCell(board, { x: 1, y: 0 }, 'black');
      setCell(board, { x: 2, y: 0 }, 'black');
      setCell(board, { x: 0, y: 1 }, 'black');
      setCell(board, { x: 1, y: 1 }, 'white');
      setCell(board, { x: 2, y: 1 }, 'black');
      setCell(board, { x: 0, y: 2 }, 'black');
      setCell(board, { x: 2, y: 2 }, 'black');

      applyHostedGameCommand(room, host, { type: 'pass' }, dependencies);
      applyHostedGameCommand(room, guest, { type: 'pass' }, dependencies);

      const scoreBeforeToggle = room.match?.state.scoring?.score.black ?? 0;

      applyHostedGameCommand(
        room,
        host,
        { type: 'toggle-dead', point: { x: 1, y: 1 } },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('scoring');
      expect(room.match?.state.scoring?.deadStones).toEqual(['1,1']);
      expect(room.match?.state.scoring?.score.black ?? 0).toBeGreaterThan(
        scoreBeforeToggle,
      );
    });

    it('creates a rematch gate only after both hosted Go players confirm scoring', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);
      applyHostedGameCommand(room, host, { type: 'pass' }, dependencies);
      applyHostedGameCommand(room, guest, { type: 'pass' }, dependencies);
      applyHostedGameCommand(
        room,
        host,
        { type: 'confirm-scoring' },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('scoring');
      expect(room.match?.state.scoring?.confirmedBy).toEqual(['black']);
      expect(room.rematch).toBeNull();

      applyHostedGameCommand(
        room,
        guest,
        { type: 'confirm-scoring' },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('finished');
      expect(room.match?.state.result).toMatchObject({
        winner: 'white',
        reason: 'score',
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
    });

    it('keeps legacy finalize-scoring as a one-player confirmation only', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);
      applyHostedGameCommand(room, host, { type: 'pass' }, dependencies);
      applyHostedGameCommand(room, guest, { type: 'pass' }, dependencies);
      applyHostedGameCommand(
        room,
        host,
        { type: 'finalize-scoring' },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('scoring');
      expect(room.match?.state.scoring?.confirmedBy).toEqual(['black']);
      expect(room.rematch).toBeNull();
    });

    it('clears hosted scoring confirmations when dead stones change', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);
      setCell(getHostedMatch(room).state.board, { x: 1, y: 1 }, 'white');
      applyHostedGameCommand(room, host, { type: 'pass' }, dependencies);
      applyHostedGameCommand(room, guest, { type: 'pass' }, dependencies);
      applyHostedGameCommand(
        room,
        host,
        { type: 'confirm-scoring' },
        dependencies,
      );
      applyHostedGameCommand(
        room,
        guest,
        { type: 'toggle-dead', point: { x: 1, y: 1 } },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('scoring');
      expect(room.match?.state.scoring?.confirmedBy).toEqual([]);
      expect(room.match?.state.scoring?.revision).toBe(1);
      expect(room.match?.state.scoring?.deadStones).toEqual(['1,1']);
    });

    it('resumes hosted Go play when either player disputes scoring', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);

      startGoMatch(room, dependencies);
      applyHostedGameCommand(room, host, { type: 'pass' }, dependencies);
      applyHostedGameCommand(room, guest, { type: 'pass' }, dependencies);
      applyHostedGameCommand(
        room,
        guest,
        { type: 'dispute-scoring' },
        dependencies,
      );

      expect(room.match?.state.phase).toBe('playing');
      expect(room.match?.state.nextPlayer).toBe('white');
      expect(room.match?.state.scoring).toBeNull();
      expect(room.match?.state.consecutivePasses).toBe(0);
      expect(room.rematch).toBeNull();
    });
  });

  describe('maybeStartNextMatch', () => {
    it('starts a new hosted match when auto-start requirements are satisfied', () => {
      const { room } = createRoomWithSeatedPlayers(store);
      room.nextMatchSettings = {
        mode: 'gomoku',
        boardSize: 15,
        komi: 0,
      };

      expect(maybeStartNextMatch(room, dependencies)).toMatchObject({
        key: 'room.notice.match_started_auto',
      });
      expect(room.match?.state.phase).toBe('playing');
      expect(room.match?.settings.mode).toBe('gomoku');
    });

    it('opens pending digital nigiri instead of auto-starting a Go match', () => {
      const { room } = createRoomWithSeatedPlayers(store);

      expect(maybeStartNextMatch(room, dependencies)).toMatchObject({
        key: 'room.notice.nigiri_started',
      });
      expect(room.match).toBeNull();
      expect(room.nigiri).toMatchObject({
        status: 'pending',
        guesser: 'white',
      });
      expect(room.nigiriSecret?.parity).toMatch(/^(odd|even)$/);
    });

    it('keeps an existing pending digital nigiri unchanged while waiting', () => {
      const { room } = createRoomWithSeatedPlayers(store);
      room.nigiri = {
        status: 'pending',
        commitment: 'commitment',
        guesser: 'white',
      };
      room.nigiriSecret = {
        parity: 'odd',
        nonce: 'nonce',
      };

      expect(maybeStartNextMatch(room, dependencies)).toBeNull();
      expect(room.match).toBeNull();
      expect(room.nigiri).toEqual({
        status: 'pending',
        commitment: 'commitment',
        guesser: 'white',
      });
      expect(room.nigiriSecret).toEqual({
        parity: 'odd',
        nonce: 'nonce',
      });
    });

    it('starts a Go match after digital nigiri resolves', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);
      room.nigiri = {
        status: 'resolved',
        commitment: 'commitment',
        guesser: 'white',
        guess: 'odd',
        parity: 'odd',
        nonce: 'nonce',
        assignedBlack: 'white',
      };
      host.seat = 'white';
      guest.seat = 'black';

      expect(maybeStartNextMatch(room, dependencies)).toMatchObject({
        key: 'room.notice.match_started_auto',
      });
      expect(room.match?.settings.mode).toBe('go');
      expect(room.match?.settings.players).toEqual({
        black: 'Guest',
        white: 'Host',
      });
      expect(room.nigiri).toMatchObject({
        status: 'resolved',
        assignedBlack: 'white',
      });
    });

    it('does not auto-start while blocked until a seat changes', () => {
      const { room } = createRoomWithSeatedPlayers(store);
      room.autoStartBlockedUntilSeatChange = true;

      expect(maybeStartNextMatch(room, dependencies)).toBeNull();
      expect(room.match).toBeNull();
    });

    it('does not auto-start while the current match is still live', () => {
      const { room } = createRoomWithSeatedPlayers(store);

      startGomokuMatch(room, dependencies);
      const liveMatch = room.match;

      expect(maybeStartNextMatch(room, dependencies)).toBeNull();
      expect(room.match).toBe(liveMatch);
    });

    it('does not auto-start while rematch responses are still pending', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);
      room.rematch = createHostedRematchState(host.id, guest.id);

      expect(maybeStartNextMatch(room, dependencies)).toBeNull();
      expect(room.match).toBeNull();
    });

    it('logs rich debug context when auto-start is skipped', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);
      const logger = {
        log: vi.fn(),
        debug: vi.fn(),
      } as unknown as Logger;
      const loggingDependencies: RoomsMatchTransitionDependencies = {
        ...dependencies,
        logger,
      };
      room.rematch = createHostedRematchState(host.id, guest.id);

      expect(maybeStartNextMatch(room, loggingDependencies)).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('waiting_for_rematch_responses'),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('rematchResponses'),
      );
    });

    it('does not auto-start when rematch participants no longer match the seats', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);
      room.rematch = {
        participants: {
          black: guest.id,
          white: host.id,
        },
        responses: {
          black: 'accepted',
          white: 'accepted',
        },
      };

      expect(maybeStartNextMatch(room, dependencies)).toBeNull();
      expect(room.match).toBeNull();
    });
  });

  describe('startMatchWithCurrentSeats', () => {
    it('creates a fresh match and clears rematch-related room state', () => {
      const { room, host, guest } = createRoomWithSeatedPlayers(store);
      room.rematch = createHostedRematchState(host.id, guest.id);
      room.autoStartBlockedUntilSeatChange = true;

      startMatchWithCurrentSeats(
        room,
        {
          mode: 'gomoku',
          boardSize: 15,
          komi: 0,
        },
        dependencies,
      );

      expect(room.match?.settings.players).toEqual({
        black: 'Host',
        white: 'Guest',
      });
      expect(room.rematch).toBeNull();
      expect(room.autoStartBlockedUntilSeatChange).toBe(false);
    });
  });
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
  host.seat = 'black';
  guest.seat = 'white';

  return { room, host, guest };
}

function getHostedMatch(room: RoomRecord): NonNullable<RoomRecord['match']> {
  if (!room.match) {
    throw new Error('Expected room to have an active match.');
  }

  return room.match;
}

function addParticipant(
  store: RoomsStore,
  room: RoomRecord,
  displayName: string,
): ParticipantRecord {
  const participant = store.createParticipant(
    displayName,
    false,
    '2026-04-20T00:00:00.000Z',
  );

  room.participants.set(participant.id, participant);
  room.tokenIndex.set(participant.token, participant.id);

  return participant;
}

function startGomokuMatch(
  room: RoomRecord,
  dependencies: RoomsMatchTransitionDependencies,
): void {
  startMatchWithCurrentSeats(
    room,
    {
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
    },
    dependencies,
  );
}

function startTimedGomokuMatch(
  room: RoomRecord,
  dependencies: RoomsMatchTransitionDependencies,
  timeControl = {
    mainTimeMs: 10_000,
    periodTimeMs: 30_000,
    periods: 5,
  },
): void {
  startMatchWithCurrentSeats(
    room,
    {
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      timeControl,
    },
    dependencies,
  );
}

function startGoMatch(
  room: RoomRecord,
  dependencies: RoomsMatchTransitionDependencies,
): void {
  startMatchWithCurrentSeats(
    room,
    {
      mode: 'go',
      boardSize: 9,
      komi: 6.5,
    },
    dependencies,
  );
}
