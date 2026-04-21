import {
  BoardMatrix,
  BoardPoint,
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

/**
 * Recomputes the Go scoring snapshot from the current board and marked dead stones.
 */
export function buildScoringState(
  board: BoardMatrix,
  deadStoneKeys: Set<string>,
  komi: number,
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
  const score = territory.reduce<ScoreBreakdown>(
    (currentScore, region) => {
      if (region.owner === 'black') {
        currentScore.blackTerritory += region.points.length;
      } else if (region.owner === 'white') {
        currentScore.whiteTerritory += region.points.length;
      }

      currentScore.black =
        currentScore.blackStones + currentScore.blackTerritory;
      currentScore.white =
        currentScore.whiteStones +
        currentScore.whiteTerritory +
        currentScore.komi;

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
    },
  );

  return {
    deadStones: [...deadStoneKeys],
    territory,
    score,
  };
}
