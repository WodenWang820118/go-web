import {
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  GameMode,
} from './types';

export interface GameModeMeta {
  mode: GameMode;
  title: string;
  strapline: string;
  description: string;
  boardSizes: readonly number[];
  objective: string;
  help: string[];
  setupHint: string;
}

export const GAME_MODE_META: Record<GameMode, GameModeMeta> = {
  go: {
    mode: 'go',
    title: 'Go',
    strapline: 'Territory, captures, ko, and endgame scoring',
    description:
      'Classic stone placement with captures, pass/resign actions, and Chinese area scoring after two consecutive passes.',
    boardSizes: GO_BOARD_SIZES,
    objective:
      'Build strong shapes, capture stones when groups lose all liberties, and finish with more area after komi.',
    help: [
      'Black moves first and may place one stone on any empty intersection.',
      'Groups with no liberties are captured and removed immediately.',
      'Immediate ko recapture is rejected to prevent repeating the previous position.',
      'Two consecutive passes open scoring. During scoring, click groups to mark them dead before finalizing.',
      `Chinese area scoring is used. White receives ${DEFAULT_GO_KOMI} komi.`,
    ],
    setupHint: 'Choose a 9x9, 13x13, or 19x19 board for local play.',
  },
  gomoku: {
    mode: 'gomoku',
    title: 'Gomoku',
    strapline: 'Fast five-in-a-row on a 15x15 board',
    description:
      'Freestyle Gomoku with alternating turns, occupied-cell rejection, and a win on any horizontal, vertical, or diagonal line of five or more stones.',
    boardSizes: [GOMOKU_BOARD_SIZE],
    objective:
      'Connect five or more stones in a straight line before your opponent does.',
    help: [
      'The board is fixed to 15x15.',
      'Players alternate placing stones on empty intersections only.',
      'Any five-in-a-row or longer line wins immediately.',
      'If the board fills without a winning line, the game ends in a draw.',
    ],
    setupHint: 'Gomoku uses a fixed 15x15 board in this first release.',
  },
};

export const GAME_MODE_LIST = Object.values(GAME_MODE_META);

export function isGameMode(value: string | null | undefined): value is GameMode {
  return value === 'go' || value === 'gomoku';
}

export function getGameModeMeta(mode: GameMode): GameModeMeta {
  return GAME_MODE_META[mode];
}
