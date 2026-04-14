import { GOMOKU_BOARD_SIZE, GO_BOARD_SIZES, GameMode } from '../types';

/**
 * Describes the selectable setup options for a supported game mode.
 */
export interface GameModeMeta {
  mode: GameMode;
  boardSizes: readonly number[];
  defaultBoardSize: number;
}

/**
 * Lookup table used by setup and i18n layers to resolve game mode metadata.
 */
export const GAME_MODE_META: Record<GameMode, GameModeMeta> = {
  go: {
    mode: 'go',
    boardSizes: GO_BOARD_SIZES,
    defaultBoardSize: 19,
  },
  gomoku: {
    mode: 'gomoku',
    boardSizes: [GOMOKU_BOARD_SIZE],
    defaultBoardSize: GOMOKU_BOARD_SIZE,
  },
};

/**
 * Ordered list of supported game modes for UI iteration.
 */
export const GAME_MODE_LIST = Object.values(GAME_MODE_META);

/**
 * Narrows a string into a supported game mode.
 */
export function isGameMode(value: string | null | undefined): value is GameMode {
  return value === 'go' || value === 'gomoku';
}

/**
 * Returns the metadata record for the requested game mode.
 */
export function getGameModeMeta(mode: GameMode): GameModeMeta {
  return GAME_MODE_META[mode];
}
