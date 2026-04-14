import {
  boardHash,
  cloneBoard,
  createBoard,
  getCell,
  getNeighbors,
  setCell,
} from '../board/board-state';
import { collectGroup } from '../board/group-analysis';
import { otherPlayer } from '../board/player-utils';
import { pointKey } from '../board/point-utils';
import { buildScoringState } from './go/go-scoring';
import { createMoveRecord } from './shared/move-record';
import { failure, RulesEngine, success } from '../rules/rules-engine';
import {
  BoardPoint,
  createMessage,
  MatchSettings,
  MatchState,
  MoveCommand,
  PlayerColor,
} from '../types';

/**
 * Rules engine implementation for Go.
 */
export class GoRulesEngine implements RulesEngine {
  readonly mode = 'go' as const;

  createInitialState(settings: MatchSettings): MatchState {
    const board = createBoard(settings.boardSize);

    return {
      mode: 'go',
      boardSize: settings.boardSize,
      board,
      phase: 'playing',
      nextPlayer: 'black',
      captures: { black: 0, white: 0 },
      moveHistory: [],
      previousBoardHashes: [boardHash(board)],
      lastMove: null,
      consecutivePasses: 0,
      winnerLine: [],
      message: createMessage('game.go.state.opening'),
      scoring: null,
      result: null,
    };
  }

  applyMove(state: MatchState, settings: MatchSettings, command: MoveCommand) {
    if (state.phase !== 'playing') {
      return failure(state, 'game.go.error.match_closed');
    }

    switch (command.type) {
      case 'place':
        return this.placeStone(state, settings, command.point);
      case 'pass':
        return success(this.passTurn(state, settings));
      case 'resign':
        return success(this.resign(state, command.player ?? state.nextPlayer));
    }
  }

  toggleDeadGroup(state: MatchState, settings: MatchSettings, point: BoardPoint): MatchState {
    if (state.phase !== 'scoring' || !state.scoring) {
      return state;
    }

    const color = getCell(state.board, point);

    if (!color) {
      return state;
    }

    const group = collectGroup(state.board, point);

    if (!group) {
      return state;
    }

    const deadStones = new Set(state.scoring.deadStones);
    const shouldRemove = group.stones.every(stone => deadStones.has(pointKey(stone)));

    for (const stone of group.stones) {
      const key = pointKey(stone);

      if (shouldRemove) {
        deadStones.delete(key);
      } else {
        deadStones.add(key);
      }
    }

    const scoring = buildScoringState(state.board, deadStones, settings.komi);

    return {
      ...state,
      scoring,
      message: createMessage(
        shouldRemove
          ? 'game.go.state.group_restored'
          : 'game.go.state.group_marked_dead',
        {
          player: createMessage(`common.player.${color}`),
        }
      ),
    };
  }

  finalizeScoring(state: MatchState, settings: MatchSettings): MatchState {
    if (state.phase !== 'scoring' || !state.scoring) {
      return state;
    }

    void settings;

    const { score } = state.scoring;
    const winner =
      score.black === score.white ? 'draw' : score.black > score.white ? 'black' : 'white';
    const margin = Math.abs(score.black - score.white);
    const summary =
      winner === 'draw'
        ? createMessage('game.result.draw')
        : createMessage('game.result.win_by_points', {
            winner: createMessage(`common.player.${winner}`),
            margin: margin.toFixed(1),
          });

    return {
      ...state,
      phase: 'finished',
      result: {
        winner,
        reason: 'score',
        margin,
        score,
        summary,
      },
      message: summary,
    };
  }

  private placeStone(state: MatchState, settings: MatchSettings, point: BoardPoint) {
    if (getCell(state.board, point) !== null) {
      return failure(state, 'game.error.intersection_occupied');
    }

    const nextBoard = cloneBoard(state.board);
    const player = state.nextPlayer;
    const opponent = otherPlayer(player);
    const capturedPoints: BoardPoint[] = [];

    setCell(nextBoard, point, player);

    for (const neighbor of getNeighbors(point, settings.boardSize)) {
      if (getCell(nextBoard, neighbor) !== opponent) {
        continue;
      }

      const group = collectGroup(nextBoard, neighbor);

      if (!group || group.liberties.length > 0) {
        continue;
      }

      capturedPoints.push(...group.stones);

      for (const stone of group.stones) {
        setCell(nextBoard, stone, null);
      }
    }

    const ownGroup = collectGroup(nextBoard, point);

    if (!ownGroup || ownGroup.liberties.length === 0) {
      return failure(state, 'game.go.error.suicide');
    }

    const nextHash = boardHash(nextBoard);

    if (
      state.previousBoardHashes.length >= 2 &&
      nextHash === state.previousBoardHashes[state.previousBoardHashes.length - 2]
    ) {
      return failure(state, 'game.go.error.ko_repeat');
    }

    const nextCaptures = {
      ...state.captures,
      [player]: state.captures[player] + capturedPoints.length,
    };

    const moveRecord = createMoveRecord(state, player, { type: 'place', point }, nextBoard, {
      phaseAfterMove: 'playing',
      capturesAfterMove: nextCaptures,
      capturedPoints,
    });

    return success({
      ...state,
      board: nextBoard,
      nextPlayer: opponent,
      captures: nextCaptures,
      moveHistory: [...state.moveHistory, moveRecord],
      previousBoardHashes: [...state.previousBoardHashes, nextHash],
      lastMove: moveRecord,
      consecutivePasses: 0,
      winnerLine: [],
      message:
        capturedPoints.length > 0
          ? createMessage('game.go.state.captured_stones', {
              player: createMessage(`common.player.${player}`),
              count: capturedPoints.length,
            })
          : createMessage('game.state.next_turn', {
              player: createMessage(`common.player.${opponent}`),
            }),
      scoring: null,
      result: null,
    });
  }

  private passTurn(state: MatchState, settings: MatchSettings): MatchState {
    const player = state.nextPlayer;
    const consecutivePasses = state.consecutivePasses + 1;
    const phaseAfterMove = consecutivePasses >= 2 ? 'scoring' : 'playing';
    const scoring =
      phaseAfterMove === 'scoring'
        ? buildScoringState(state.board, new Set<string>(), settings.komi)
        : null;
    const moveRecord = createMoveRecord(state, player, { type: 'pass' }, state.board, {
      phaseAfterMove,
      capturesAfterMove: state.captures,
    });

    return {
      ...state,
      phase: phaseAfterMove,
      nextPlayer: otherPlayer(player),
      moveHistory: [...state.moveHistory, moveRecord],
      previousBoardHashes: [...state.previousBoardHashes, boardHash(state.board)],
      lastMove: moveRecord,
      consecutivePasses,
      message:
        phaseAfterMove === 'scoring'
          ? createMessage('game.go.state.scoring_started')
          : createMessage('game.go.state.next_turn_after_pass', {
              player: createMessage(`common.player.${otherPlayer(player)}`),
            }),
      scoring,
    };
  }

  private resign(state: MatchState, resignedBy: PlayerColor): MatchState {
    const winner = otherPlayer(resignedBy);
    const moveRecord = createMoveRecord(
      state,
      resignedBy,
      { type: 'resign', player: resignedBy },
      state.board,
      {
        phaseAfterMove: 'finished',
        capturesAfterMove: state.captures,
      }
    );
    const summary = createMessage('game.result.win_by_resignation', {
      winner: createMessage(`common.player.${winner}`),
    });

    return {
      ...state,
      phase: 'finished',
      nextPlayer: winner,
      moveHistory: [...state.moveHistory, moveRecord],
      previousBoardHashes: [...state.previousBoardHashes, boardHash(state.board)],
      lastMove: moveRecord,
      result: {
        winner,
        reason: 'resign',
        resignedBy,
        summary,
      },
      message: summary,
    };
  }
}
