import { GameStartSettings } from '@gx/go/contracts';
import {
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  type MatchSettings,
} from '@gx/go/domain';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';

export function normalizeHostedStartSettings(
  settings: GameStartSettings,
  roomsErrors: RoomsErrorsService,
): GameStartSettings {
  if (settings.mode !== 'go' && settings.mode !== 'gomoku') {
    throw roomsErrors.badRequest('room.error.unsupported_mode');
  }

  if (settings.mode === 'go') {
    if (!GO_BOARD_SIZES.includes(settings.boardSize as 9 | 13 | 19)) {
      throw roomsErrors.badRequest('room.error.invalid_go_board_size');
    }

    return {
      mode: 'go',
      boardSize: settings.boardSize as 9 | 13 | 19,
      komi:
        typeof settings.komi === 'number' && Number.isFinite(settings.komi)
          ? settings.komi
          : DEFAULT_GO_KOMI,
    };
  }

  if (settings.boardSize !== GOMOKU_BOARD_SIZE) {
    throw roomsErrors.badRequest('room.error.invalid_gomoku_board_size');
  }

  return {
    mode: 'gomoku',
    boardSize: GOMOKU_BOARD_SIZE,
    komi: 0,
  };
}

export function buildHostedMatchSettings(
  settings: GameStartSettings,
  blackName: string,
  whiteName: string,
): MatchSettings {
  return {
    mode: settings.mode,
    boardSize: settings.boardSize as MatchSettings['boardSize'],
    komi: settings.mode === 'go' ? (settings.komi ?? DEFAULT_GO_KOMI) : 0,
    players: {
      black: blackName,
      white: whiteName,
    },
  };
}
