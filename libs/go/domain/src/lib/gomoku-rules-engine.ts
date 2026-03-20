import {
  boardHash,
  boardIsFull,
  capitalizePlayerColor,
  cloneBoard,
  createBoard,
  findWinningLine,
  formatMoveNotation,
  getCell,
  otherPlayer,
  setCell,
} from './board-utils';
import { failure, RulesEngine, success } from './rules-engine';
import { MatchSettings, MatchState, MoveCommand, MoveRecord, PlayerColor } from './types';

export class GomokuRulesEngine implements RulesEngine {
  readonly mode = 'gomoku' as const;

  createInitialState(settings: MatchSettings): MatchState {
    const board = createBoard(settings.boardSize);

    return {
      mode: 'gomoku',
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
      message: 'Black to move. Build five in a row to win.',
      scoring: null,
      result: null,
    };
  }

  applyMove(state: MatchState, settings: MatchSettings, command: MoveCommand) {
    if (state.phase !== 'playing') {
      return failure(state, 'This Gomoku match is already complete.');
    }

    switch (command.type) {
      case 'pass':
        return failure(state, 'Passing is not available in Gomoku.');
      case 'resign':
        return success(this.resign(state, command.player ?? state.nextPlayer));
      case 'place':
        return this.placeStone(state, settings, command.point);
    }
  }

  private placeStone(state: MatchState, settings: MatchSettings, point: { x: number; y: number }) {
    if (getCell(state.board, point) !== null) {
      return failure(state, 'That intersection is already occupied.');
    }

    const nextBoard = cloneBoard(state.board);
    const player = state.nextPlayer;
    const opponent = otherPlayer(player);

    setCell(nextBoard, point, player);

    const moveRecord = createMoveRecord(state, player, { type: 'place', point }, nextBoard);
    const winningLine = findWinningLine(nextBoard, point, player, 5);

    if (winningLine) {
      const summary = `${capitalizePlayerColor(player)} wins with five in a row.`;

      return success({
        ...state,
        board: nextBoard,
        phase: 'finished',
        nextPlayer: opponent,
        moveHistory: [...state.moveHistory, moveRecord],
        previousBoardHashes: [...state.previousBoardHashes, boardHash(nextBoard)],
        lastMove: moveRecord,
        winnerLine: winningLine,
        message: summary,
        result: {
          winner: player,
          reason: 'five-in-row',
          summary,
          winningLine,
        },
      });
    }

    if (boardIsFull(nextBoard)) {
      const summary = 'The board is full. The match ends in a draw.';

      return success({
        ...state,
        board: nextBoard,
        phase: 'finished',
        nextPlayer: opponent,
        moveHistory: [...state.moveHistory, moveRecord],
        previousBoardHashes: [...state.previousBoardHashes, boardHash(nextBoard)],
        lastMove: moveRecord,
        winnerLine: [],
        message: summary,
        result: {
          winner: 'draw',
          reason: 'draw',
          summary,
        },
      });
    }

    return success({
      ...state,
      board: nextBoard,
      nextPlayer: opponent,
      moveHistory: [...state.moveHistory, moveRecord],
      previousBoardHashes: [...state.previousBoardHashes, boardHash(nextBoard)],
      lastMove: moveRecord,
      winnerLine: [],
      message: `${capitalizePlayerColor(opponent)} to move.`,
      scoring: null,
      result: null,
    });
  }

  private resign(state: MatchState, resignedBy: PlayerColor): MatchState {
    const winner = otherPlayer(resignedBy);
    const moveRecord = createMoveRecord(
      state,
      resignedBy,
      { type: 'resign', player: resignedBy },
      state.board
    );
    const summary = `${capitalizePlayerColor(winner)} wins by resignation.`;

    return {
      ...state,
      phase: 'finished',
      nextPlayer: winner,
      moveHistory: [...state.moveHistory, moveRecord],
      previousBoardHashes: [...state.previousBoardHashes, boardHash(state.board)],
      lastMove: moveRecord,
      winnerLine: [],
      message: summary,
      result: {
        winner,
        reason: 'resign',
        resignedBy,
        summary,
      },
    };
  }
}

function createMoveRecord(
  state: MatchState,
  player: PlayerColor,
  command: MoveCommand,
  board: MatchState['board']
): MoveRecord {
  const moveNumber = state.moveHistory.length + 1;

  return {
    id: `move-${moveNumber}-${player}-${command.type}`,
    moveNumber,
    player,
    command,
    notation: formatMoveNotation(command, state.boardSize),
    boardHashAfterMove: boardHash(board),
    phaseAfterMove: state.phase,
    capturedPoints: [],
    capturesAfterMove: { ...state.captures },
  };
}
