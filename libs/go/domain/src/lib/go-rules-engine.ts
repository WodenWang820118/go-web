import {
  boardHash,
  capitalizePlayerColor,
  cloneBoard,
  collectGroup,
  countStones,
  createBoard,
  formatMoveNotation,
  getAllPoints,
  getCell,
  getNeighbors,
  otherPlayer,
  parsePointKey,
  pointKey,
  setCell,
} from './board-utils';
import { failure, RulesEngine, success } from './rules-engine';
import {
  BoardMatrix,
  BoardPoint,
  MatchSettings,
  MatchState,
  MoveCommand,
  MoveRecord,
  PlayerColor,
  ScoreBreakdown,
  ScoringState,
  TerritoryRegion,
} from './types';

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
      message: 'Black to move. Place the opening stone.',
      scoring: null,
      result: null,
    };
  }

  applyMove(state: MatchState, settings: MatchSettings, command: MoveCommand) {
    if (state.phase !== 'playing') {
      return failure(state, 'This Go match is no longer accepting moves.');
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
      message: `${capitalizePlayerColor(color)} group ${shouldRemove ? 'restored' : 'marked dead'} for scoring.`,
    };
  }

  finalizeScoring(state: MatchState, _settings: MatchSettings): MatchState {
    if (state.phase !== 'scoring' || !state.scoring) {
      return state;
    }

    void _settings;

    const { score } = state.scoring;
    const winner =
      score.black === score.white ? 'draw' : score.black > score.white ? 'black' : 'white';
    const margin = Math.abs(score.black - score.white);
    const summary =
      winner === 'draw'
        ? 'The match ends in a draw.'
        : `${capitalizePlayerColor(winner)} wins by ${margin.toFixed(1)} points.`;

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
      return failure(state, 'That intersection is already occupied.');
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
      return failure(state, 'Suicide is not legal in this ruleset.');
    }

    const nextHash = boardHash(nextBoard);

    if (
      state.previousBoardHashes.length >= 2 &&
      nextHash === state.previousBoardHashes[state.previousBoardHashes.length - 2]
    ) {
      return failure(state, 'Ko prevents an immediate repetition of the previous position.');
    }

    const nextCaptures = {
      ...state.captures,
      [player]: state.captures[player] + capturedPoints.length,
    };

    const moveRecord = createMoveRecord(
      state,
      player,
      { type: 'place', point },
      nextBoard,
      'playing',
      nextCaptures,
      capturedPoints
    );

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
          ? `${capitalizePlayerColor(player)} captured ${capturedPoints.length} stone${capturedPoints.length === 1 ? '' : 's'}.`
          : `${capitalizePlayerColor(opponent)} to move.`,
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
    const moveRecord = createMoveRecord(
      state,
      player,
      { type: 'pass' },
      state.board,
      phaseAfterMove,
      state.captures
    );

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
          ? 'Scoring phase started. Click groups to mark them dead, then finalize the result.'
          : `${capitalizePlayerColor(otherPlayer(player))} to move after the pass.`,
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
      'finished',
      state.captures
    );
    const summary = `${capitalizePlayerColor(winner)} wins by resignation.`;

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

function createMoveRecord(
  state: MatchState,
  player: PlayerColor,
  command: MoveCommand,
  board: BoardMatrix,
  phaseAfterMove: MatchState['phase'],
  capturesAfterMove: Record<PlayerColor, number>,
  capturedPoints: BoardPoint[] = []
): MoveRecord {
  const moveNumber = state.moveHistory.length + 1;

  return {
    id: `move-${moveNumber}-${player}-${command.type}`,
    moveNumber,
    player,
    command,
    notation: formatMoveNotation(command, state.boardSize),
    boardHashAfterMove: boardHash(board),
    phaseAfterMove,
    capturedPoints,
    capturesAfterMove: { ...capturesAfterMove },
  };
}

function buildScoringState(
  board: BoardMatrix,
  deadStoneKeys: Set<string>,
  komi: number
): ScoringState {
  const adjustedBoard = cloneBoard(board);
  const boardSize = board.length as MatchState['boardSize'];

  for (const key of deadStoneKeys) {
    const point = parsePointKey(key);
    setCell(adjustedBoard, point, null);
  }

  const territory: TerritoryRegion[] = [];
  const visited = new Set<string>();

  for (const point of getAllPoints(boardSize)) {
    if (getCell(adjustedBoard, point) !== null || visited.has(pointKey(point))) {
      continue;
    }

    const pending = [point];
    const regionPoints: BoardPoint[] = [];
    const borderingColors = new Set<PlayerColor>();

    while (pending.length > 0) {
      const current = pending.pop();

      if (!current) {
        continue;
      }

      const currentKey = pointKey(current);

      if (visited.has(currentKey)) {
        continue;
      }

      visited.add(currentKey);
      regionPoints.push(current);

      for (const neighbor of getNeighbors(current, boardSize)) {
        const neighborValue = getCell(adjustedBoard, neighbor);

        if (neighborValue === null) {
          if (!visited.has(pointKey(neighbor))) {
            pending.push(neighbor);
          }

          continue;
        }

        borderingColors.add(neighborValue);
      }
    }

    territory.push({
      owner: borderingColors.size === 1 ? [...borderingColors][0] : null,
      points: regionPoints,
    });
  }

  const stoneCounts = countStones(adjustedBoard);
  const score = territory.reduce<ScoreBreakdown>(
    (currentScore, region) => {
      if (region.owner === 'black') {
        currentScore.blackTerritory += region.points.length;
      } else if (region.owner === 'white') {
        currentScore.whiteTerritory += region.points.length;
      }

      currentScore.black = currentScore.blackStones + currentScore.blackTerritory;
      currentScore.white =
        currentScore.whiteStones + currentScore.whiteTerritory + currentScore.komi;

      return currentScore;
    },
    {
      black: stoneCounts.black,
      white: stoneCounts.white + komi,
      blackStones: stoneCounts.black,
      whiteStones: stoneCounts.white,
      blackTerritory: 0,
      whiteTerritory: 0,
      komi,
    }
  );

  return {
    deadStones: [...deadStoneKeys],
    territory,
    score,
  };
}
