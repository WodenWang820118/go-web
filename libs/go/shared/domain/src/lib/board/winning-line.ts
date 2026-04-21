import { BoardMatrix, BoardPoint, BoardSize, PlayerColor } from '../types';
import { getCell } from './board-state';
import { isPointInBounds } from './point-utils';

/**
 * Finds a contiguous winning line through the latest placed stone.
 */
export function findWinningLine(
  board: BoardMatrix,
  point: BoardPoint,
  color: PlayerColor,
  winLength = 5,
): BoardPoint[] | null {
  const boardSize = board.length as BoardSize;
  const directions = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
  ];

  for (const direction of directions) {
    const line = collectDirectionalLine(
      board,
      point,
      color,
      boardSize,
      direction,
    );

    if (line.length >= winLength) {
      return line;
    }
  }

  return null;
}

function collectDirectionalLine(
  board: BoardMatrix,
  origin: BoardPoint,
  color: PlayerColor,
  boardSize: BoardSize,
  direction: { x: number; y: number },
): BoardPoint[] {
  const backwards: BoardPoint[] = [];
  const forwards: BoardPoint[] = [origin];

  let current = {
    x: origin.x - direction.x,
    y: origin.y - direction.y,
  };

  while (
    isPointInBounds(current, boardSize) &&
    getCell(board, current) === color
  ) {
    backwards.push(current);
    current = {
      x: current.x - direction.x,
      y: current.y - direction.y,
    };
  }

  current = {
    x: origin.x + direction.x,
    y: origin.y + direction.y,
  };

  while (
    isPointInBounds(current, boardSize) &&
    getCell(board, current) === color
  ) {
    forwards.push(current);
    current = {
      x: current.x + direction.x,
      y: current.y + direction.y,
    };
  }

  return backwards.reverse().concat(forwards);
}
