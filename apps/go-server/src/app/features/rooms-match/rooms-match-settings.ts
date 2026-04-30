import {
  GameStartSettings,
  normalizeGameStartTimeControl,
} from '@gx/go/contracts';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_GO_RULE_OPTIONS,
  GOMOKU_FREE_OPENING,
  GOMOKU_BOARD_SIZE,
  GOMOKU_STANDARD_EXACT_FIVE_RULESET,
  GO_AREA_AGREEMENT_RULESET,
  GO_BOARD_SIZES,
  GO_DIGITAL_NIGIRI_OPENING,
  isGoKoRule,
  isGoScoringRule,
  type GoRuleOptions,
  type MatchSettings,
} from '@gx/go/domain';
import { Inject, Injectable } from '@nestjs/common';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';

@Injectable()
export class RoomsMatchSettingsService {
  constructor(
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
  ) {}

  normalizeHostedStartSettings(settings: GameStartSettings): GameStartSettings {
    if (settings.mode !== 'go' && settings.mode !== 'gomoku') {
      throw this.roomsErrors.badRequest('room.error.unsupported_mode');
    }

    if (settings.mode === 'go') {
      if (!GO_BOARD_SIZES.includes(settings.boardSize as 9 | 13 | 19)) {
        throw this.roomsErrors.badRequest('room.error.invalid_go_board_size');
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
        goRules: this.normalizeGoRuleOptions(settings.goRules),
        timeControl: this.normalizeTimeControl('go', settings.timeControl),
      };
    }

    if (settings.goRules !== undefined) {
      throw this.roomsErrors.badRequest('room.error.go_rules_not_supported');
    }

    if (settings.boardSize !== GOMOKU_BOARD_SIZE) {
      throw this.roomsErrors.badRequest('room.error.invalid_gomoku_board_size');
    }

    return {
      mode: 'gomoku',
      boardSize: GOMOKU_BOARD_SIZE,
      komi: 0,
      ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
      openingRule: GOMOKU_FREE_OPENING,
      timeControl: this.normalizeTimeControl('gomoku', settings.timeControl),
    };
  }

  buildHostedMatchSettings(
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
      ...(settings.mode === 'go'
        ? {
            goRules: this.normalizeGoRuleOptions(settings.goRules),
          }
        : {}),
      timeControl: this.normalizeTimeControl(
        settings.mode,
        settings.timeControl,
      ),
      players: {
        black: blackName,
        white: whiteName,
      },
    };
  }

  private normalizeTimeControl(
    mode: GameStartSettings['mode'],
    timeControl: unknown,
  ): GameStartSettings['timeControl'] {
    const result = normalizeGameStartTimeControl(mode, timeControl);

    if ('reason' in result) {
      throw this.roomsErrors.badRequest(
        result.reason === 'time-control-not-supported'
          ? 'room.error.time_control_not_supported'
          : 'room.error.invalid_time_control',
      );
    }

    return result.timeControl;
  }

  private normalizeGoRuleOptions(goRules: unknown): GoRuleOptions {
    if (goRules === undefined || goRules === null) {
      return DEFAULT_GO_RULE_OPTIONS;
    }

    if (typeof goRules !== 'object') {
      throw this.roomsErrors.badRequest('room.error.invalid_go_rules');
    }

    const options = goRules as Partial<GoRuleOptions>;

    if (!isGoKoRule(options.koRule) || !isGoScoringRule(options.scoringRule)) {
      throw this.roomsErrors.badRequest('room.error.invalid_go_rules');
    }

    return {
      koRule: options.koRule,
      scoringRule: options.scoringRule,
    };
  }
}
