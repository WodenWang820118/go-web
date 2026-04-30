import {
  BoardMatrix,
  BoardPoint,
  GoScoringRule,
  MatchState,
  PlayerColor,
  ScoreBreakdown,
  ScoringState,
  TerritoryRegion,
} from '../../types';
import {
  cloneBoard,
  countStones,
  getAllPoints,
  getCell,
  getNeighbors,
  setCell,
} from '../../board/board-state';
import { parsePointKey, pointKey } from '../../board/point-utils';

interface GoScoringOptions {
  komi: number;
  captures: Record<PlayerColor, number>;
  scoringRule: GoScoringRule;
}

/**
 * Recomputes the Go scoring snapshot from the current board and marked dead stones.
 */
export function buildScoringState(
  board: BoardMatrix,
  deadStoneKeys: Set<string>,
  options: GoScoringOptions,
): ScoringState {
  const adjustedBoard = cloneBoard(board);
  const boardSize = board.length as MatchState['boardSize'];
  const deadStoneCounts: Record<PlayerColor, number> = {
    black: 0,
    white: 0,
  };

  for (const key of deadStoneKeys) {
    const point = parsePointKey(key);
    const color = getCell(board, point);

    if (color) {
      deadStoneCounts[color] += 1;
    }

    setCell(adjustedBoard, point, null);
  }

  const territory: TerritoryRegion[] = [];
  const visited = new Set<string>();

  for (const point of getAllPoints(boardSize)) {
    if (
      getCell(adjustedBoard, point) !== null ||
      visited.has(pointKey(point))
    ) {
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
  const territoryCounts = territory.reduce<Record<PlayerColor, number>>(
    (counts, region) => {
      if (region.owner) {
        counts[region.owner] += region.points.length;
      }

      return counts;
    },
    {
      black: 0,
      white: 0,
    },
  );
  const blackPrisoners =
    options.scoringRule === 'japanese-territory'
      ? options.captures.black + deadStoneCounts.white
      : 0;
  const whitePrisoners =
    options.scoringRule === 'japanese-territory'
      ? options.captures.white + deadStoneCounts.black
      : 0;
  const score: ScoreBreakdown = {
    black:
      options.scoringRule === 'japanese-territory'
        ? territoryCounts.black + blackPrisoners
        : stoneCounts.black + territoryCounts.black,
    white:
      options.scoringRule === 'japanese-territory'
        ? territoryCounts.white + whitePrisoners + options.komi
        : stoneCounts.white + territoryCounts.white + options.komi,
    blackStones: stoneCounts.black,
    whiteStones: stoneCounts.white,
    blackTerritory: territoryCounts.black,
    whiteTerritory: territoryCounts.white,
    blackPrisoners,
    whitePrisoners,
    komi: options.komi,
    scoringRule: options.scoringRule,
  };

  return {
    deadStones: [...deadStoneKeys],
    territory,
    score,
    confirmedBy: [],
    revision: 0,
  };
}
