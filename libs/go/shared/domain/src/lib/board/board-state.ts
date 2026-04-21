import {
  BoardMatrix,
  BoardPoint,
  BoardSize,
  CellValue,
  PlayerColor,
} from '../types';
import { isPointInBounds } from './point-utils';

/**
 * Creates an empty board matrix for the requested size.
 */
export function createBoard(size: BoardSize): BoardMatrix {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
}

/**
 * Produces a shallow-cloned board matrix suitable for immutable updates.
 */
export function cloneBoard(board: BoardMatrix): BoardMatrix {
  return board.map((row) => [...row]);
}

/**
 * Reads a board cell and returns `null` for out-of-bounds access.
 */
export function getCell(board: BoardMatrix, point: BoardPoint): CellValue {
  return board[point.y]?.[point.x] ?? null;
}

/**
 * Mutates a board cell in-place.
 */
export function setCell(
  board: BoardMatrix,
  point: BoardPoint,
  value: CellValue,
): void {
  board[point.y][point.x] = value;
}

/**
 * Lists orthogonal neighbors that remain inside the board.
 */
export function getNeighbors(
  point: BoardPoint,
  boardSize: BoardSize,
): BoardPoint[] {
  const candidates = [
    { x: point.x, y: point.y - 1 },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x - 1, y: point.y },
  ];

  return candidates.filter((candidate) =>
    isPointInBounds(candidate, boardSize),
  );
}

/**
 * Returns every board point for the requested board size.
 */
export function getAllPoints(boardSize: BoardSize): BoardPoint[] {
  return Array.from({ length: boardSize * boardSize }, (_, index) => ({
    x: index % boardSize,
    y: Math.floor(index / boardSize),
  }));
}

/**
 * Generates a compact hash for ko detection and move history tracking.
 */
export function boardHash(board: BoardMatrix): string {
  return board
    .map((row) => row.map((cell) => (cell ? cell[0] : '.')).join(''))
    .join('|');
}

/**
 * Reports whether every board intersection is occupied.
 */
export function boardIsFull(board: BoardMatrix): boolean {
  return board.every((row) => row.every((cell) => cell !== null));
}

/**
 * Counts black and white stones on the board.
 */
export function countStones(board: BoardMatrix): Record<PlayerColor, number> {
  return board.flat().reduce<Record<PlayerColor, number>>(
    (counts, cell) => {
      if (cell) {
        counts[cell] += 1;
      }

      return counts;
    },
    { black: 0, white: 0 },
  );
}
