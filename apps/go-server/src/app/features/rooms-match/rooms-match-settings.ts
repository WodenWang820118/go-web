import { GameStartSettings } from '@gx/go/contracts';
import {
  DEFAULT_HOSTED_BYO_YOMI,
  DEFAULT_GO_KOMI,
  GOMOKU_FREE_OPENING,
  GOMOKU_BOARD_SIZE,
  GOMOKU_STANDARD_EXACT_FIVE_RULESET,
  GO_AREA_AGREEMENT_RULESET,
  GO_BOARD_SIZES,
  GO_DIGITAL_NIGIRI_OPENING,
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
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: settings.timeControl ?? DEFAULT_HOSTED_BYO_YOMI,
    };
  }

  if (settings.boardSize !== GOMOKU_BOARD_SIZE) {
    throw roomsErrors.badRequest('room.error.invalid_gomoku_board_size');
  }

  return {
    mode: 'gomoku',
    boardSize: GOMOKU_BOARD_SIZE,
    komi: 0,
    ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
    openingRule: GOMOKU_FREE_OPENING,
    timeControl: settings.timeControl ?? DEFAULT_HOSTED_BYO_YOMI,
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
    ruleset:
      settings.ruleset ??
      (settings.mode === 'go'
        ? GO_AREA_AGREEMENT_RULESET
        : GOMOKU_STANDARD_EXACT_FIVE_RULESET),
    openingRule:
      settings.openingRule ??
      (settings.mode === 'go'
        ? GO_DIGITAL_NIGIRI_OPENING
        : GOMOKU_FREE_OPENING),
    timeControl: settings.timeControl ?? DEFAULT_HOSTED_BYO_YOMI,
    players: {
      black: blackName,
      white: whiteName,
    },
  };
}
