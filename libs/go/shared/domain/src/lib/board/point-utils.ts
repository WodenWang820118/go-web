import { BoardPoint, BoardSize } from '../types';

const BOARD_LABELS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

/**
 * Serializes a board coordinate into a stable string key.
 */
export function pointKey(point: BoardPoint): string {
  return `${point.x},${point.y}`;
}

/**
 * Parses a serialized board coordinate back into a point object.
 */
export function parsePointKey(key: string): BoardPoint {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

/**
 * Compares two points, treating `null` values as comparable sentinels.
 */
export function pointEquals(
  left: BoardPoint | null,
  right: BoardPoint | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return left.x === right.x && left.y === right.y;
}

/**
 * Returns whether a point lies inside a board of the given size.
 */
export function isPointInBounds(
  point: BoardPoint,
  boardSize: BoardSize,
): boolean {
  return (
    point.x >= 0 && point.y >= 0 && point.x < boardSize && point.y < boardSize
  );
}

/**
 * Builds the display labels used across supported board sizes.
 */
export function buildCoordinateLabels(boardSize: BoardSize): string[] {
  return BOARD_LABELS.slice(0, boardSize).split('');
}

/**
 * Formats a point using Go-style alphanumeric board notation.
 */
export function formatPoint(point: BoardPoint, boardSize: BoardSize): string {
  const labels = buildCoordinateLabels(boardSize);
  return `${labels[point.x]}${boardSize - point.y}`;
}
