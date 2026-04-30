import { type BoardSize } from '@gx/go/domain';

export const BOARD_CELL_SIZE = 60;
export const BOARD_PADDING = 52;

export function getBoardPixels(boardSize: BoardSize): number {
  return BOARD_PADDING * 2 + BOARD_CELL_SIZE * (boardSize - 1);
}

export function getBoardLinePosition(index: number): number {
  return BOARD_PADDING + index * BOARD_CELL_SIZE;
}

export function getBoardLinePositions(boardSize: BoardSize): number[] {
  return Array.from({ length: boardSize }, (_, index) =>
    getBoardLinePosition(index),
  );
}

export function getBoardCoordinateOffsetPercent(
  boardSize: BoardSize,
  index: number,
): number {
  return (getBoardLinePosition(index) / getBoardPixels(boardSize)) * 100;
}
