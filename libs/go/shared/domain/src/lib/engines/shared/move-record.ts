import { boardHash } from '../../board/board-state';
import { formatMoveNotation } from '../../board/move-notation';
import {
  BoardMatrix,
  BoardPoint,
  MatchState,
  MoveCommand,
  MoveRecord,
  PlayerColor,
} from '../../types';

/**
 * Builds a move history record from the current match transition.
 */
export function createMoveRecord(
  state: MatchState,
  player: PlayerColor,
  command: MoveCommand,
  board: BoardMatrix,
  options: {
    phaseAfterMove?: MatchState['phase'];
    capturesAfterMove?: Record<PlayerColor, number>;
    capturedPoints?: BoardPoint[];
  } = {}
): MoveRecord {
  const moveNumber = state.moveHistory.length + 1;

  return {
    id: `move-${moveNumber}-${player}-${command.type}`,
    moveNumber,
    player,
    command,
    notation: formatMoveNotation(command, state.boardSize),
    boardHashAfterMove: boardHash(board),
    phaseAfterMove: options.phaseAfterMove ?? state.phase,
    capturedPoints: options.capturedPoints ?? [],
    capturesAfterMove: { ...(options.capturesAfterMove ?? state.captures) },
  };
}
