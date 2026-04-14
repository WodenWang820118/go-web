import { BoardMatrix, BoardPoint, BoardSize, PlayerColor } from '../types';
import { getCell, getNeighbors } from './board-state';
import { pointKey } from './point-utils';

/**
 * Collects all stones connected to `start` and their current liberties.
 */
export function collectGroup(
  board: BoardMatrix,
  start: BoardPoint
): { color: PlayerColor; stones: BoardPoint[]; liberties: BoardPoint[] } | null {
  const color = getCell(board, start);

  if (!color) {
    return null;
  }

  const boardSize = board.length as BoardSize;
  const pending = [start];
  const visited = new Set<string>();
  const liberties = new Map<string, BoardPoint>();
  const stones: BoardPoint[] = [];

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
    stones.push(current);

    for (const neighbor of getNeighbors(current, boardSize)) {
      const neighborValue = getCell(board, neighbor);

      if (neighborValue === null) {
        liberties.set(pointKey(neighbor), neighbor);
        continue;
      }

      if (neighborValue === color && !visited.has(pointKey(neighbor))) {
        pending.push(neighbor);
      }
    }
  }

  return {
    color,
    stones,
    liberties: [...liberties.values()],
  };
}
