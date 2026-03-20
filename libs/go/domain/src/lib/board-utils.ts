import {
  BoardMatrix,
  BoardPoint,
  BoardSize,
  CellValue,
  MoveCommand,
  PlayerColor,
} from './types';

const BOARD_LABELS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

export function createBoard(size: BoardSize): BoardMatrix {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

export function cloneBoard(board: BoardMatrix): BoardMatrix {
  return board.map(row => [...row]);
}

export function pointKey(point: BoardPoint): string {
  return `${point.x},${point.y}`;
}

export function parsePointKey(key: string): BoardPoint {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function pointEquals(left: BoardPoint | null, right: BoardPoint | null): boolean {
  if (!left || !right) {
    return left === right;
  }

  return left.x === right.x && left.y === right.y;
}

export function isPointInBounds(point: BoardPoint, boardSize: BoardSize): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < boardSize && point.y < boardSize;
}

export function getCell(board: BoardMatrix, point: BoardPoint): CellValue {
  return board[point.y]?.[point.x] ?? null;
}

export function setCell(board: BoardMatrix, point: BoardPoint, value: CellValue): void {
  board[point.y][point.x] = value;
}

export function getNeighbors(point: BoardPoint, boardSize: BoardSize): BoardPoint[] {
  const candidates = [
    { x: point.x, y: point.y - 1 },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x - 1, y: point.y },
  ];

  return candidates.filter(candidate => isPointInBounds(candidate, boardSize));
}

export function getAllPoints(boardSize: BoardSize): BoardPoint[] {
  return Array.from({ length: boardSize * boardSize }, (_, index) => ({
    x: index % boardSize,
    y: Math.floor(index / boardSize),
  }));
}

export function otherPlayer(player: PlayerColor): PlayerColor {
  return player === 'black' ? 'white' : 'black';
}

export function boardHash(board: BoardMatrix): string {
  return board.map(row => row.map(cell => (cell ? cell[0] : '.')).join('')).join('|');
}

export function boardIsFull(board: BoardMatrix): boolean {
  return board.every(row => row.every(cell => cell !== null));
}

export function countStones(board: BoardMatrix): Record<PlayerColor, number> {
  return board.flat().reduce<Record<PlayerColor, number>>(
    (counts, cell) => {
      if (cell) {
        counts[cell] += 1;
      }

      return counts;
    },
    { black: 0, white: 0 }
  );
}

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

export function buildCoordinateLabels(boardSize: BoardSize): string[] {
  return BOARD_LABELS.slice(0, boardSize).split('');
}

export function formatPoint(point: BoardPoint, boardSize: BoardSize): string {
  const labels = buildCoordinateLabels(boardSize);
  return `${labels[point.x]}${boardSize - point.y}`;
}

export function formatMoveNotation(command: MoveCommand, boardSize: BoardSize): string {
  switch (command.type) {
    case 'place':
      return formatPoint(command.point, boardSize);
    case 'pass':
      return 'Pass';
    case 'resign':
      return 'Resign';
  }
}

export function capitalizePlayerColor(color: PlayerColor): string {
  return color === 'black' ? 'Black' : 'White';
}

export function findWinningLine(
  board: BoardMatrix,
  point: BoardPoint,
  color: PlayerColor,
  winLength = 5
): BoardPoint[] | null {
  const boardSize = board.length as BoardSize;
  const directions = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
  ];

  for (const direction of directions) {
    const line = collectDirectionalLine(board, point, color, boardSize, direction);

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
  direction: { x: number; y: number }
): BoardPoint[] {
  const backwards: BoardPoint[] = [];
  const forwards: BoardPoint[] = [origin];

  let current = {
    x: origin.x - direction.x,
    y: origin.y - direction.y,
  };

  while (isPointInBounds(current, boardSize) && getCell(board, current) === color) {
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

  while (isPointInBounds(current, boardSize) && getCell(board, current) === color) {
    forwards.push(current);
    current = {
      x: current.x + direction.x,
      y: current.y + direction.y,
    };
  }

  return backwards.reverse().concat(forwards);
}
