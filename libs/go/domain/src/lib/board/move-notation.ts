import { BoardSize, MoveCommand } from '../types';
import { formatPoint } from './point-utils';

/**
 * Formats a move command for sidebar and move log presentation.
 */
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
