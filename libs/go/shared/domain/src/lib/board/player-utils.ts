import { PlayerColor } from '../types';

/**
 * Returns the opposing player color.
 */
export function otherPlayer(player: PlayerColor): PlayerColor {
  return player === 'black' ? 'white' : 'black';
}

/**
 * Formats a player color for English display strings.
 */
export function capitalizePlayerColor(color: PlayerColor): string {
  return color === 'black' ? 'Black' : 'White';
}
