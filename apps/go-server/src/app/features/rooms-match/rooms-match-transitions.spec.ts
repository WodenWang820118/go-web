import {
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { setCell } from '@gx/go/domain';
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
                state: room.match!.state,
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

      const board = room.match!.state.board;
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

    it('creates a rematch gate only after hosted Go scoring is finalized', () => {
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
