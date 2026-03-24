import {
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  GameMode,
} from './types';

export interface GameModeMeta {
  mode: GameMode;
  boardSizes: readonly number[];
  defaultBoardSize: number;
}

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

export const GAME_MODE_LIST = Object.values(GAME_MODE_META);

export function isGameMode(value: string | null | undefined): value is GameMode {
  return value === 'go' || value === 'gomoku';
}

export function getGameModeMeta(mode: GameMode): GameModeMeta {
  return GAME_MODE_META[mode];
}
