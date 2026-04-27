import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_HOSTED_BYO_YOMI,
  GOMOKU_FREE_OPENING,
  GOMOKU_STANDARD_EXACT_FIVE_RULESET,
  GO_AREA_AGREEMENT_RULESET,
  GO_DIGITAL_NIGIRI_OPENING,
} from '@gx/go/domain';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import {
  buildHostedMatchSettings,
  normalizeHostedStartSettings,
} from './rooms-match-settings';

describe('rooms-match-settings', () => {
  const roomsErrors = new RoomsErrorsService();

  it('defaults go komi when a valid go start omits it', () => {
    expect(
      normalizeHostedStartSettings(
        {
          mode: 'go',
          boardSize: 19,
        },
        roomsErrors,
      ),
    ).toEqual({
      mode: 'go',
      boardSize: 19,
      komi: DEFAULT_GO_KOMI,
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    });
  });

  it('falls back to the default komi when a go start passes a non-finite komi', () => {
    expect(
      normalizeHostedStartSettings(
        {
          mode: 'go',
          boardSize: 19,
          komi: Number.NaN,
        },
        roomsErrors,
      ),
    ).toEqual({
      mode: 'go',
      boardSize: 19,
      komi: DEFAULT_GO_KOMI,
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    });
  });

  it('falls back to the default komi when a go start passes a null komi', () => {
    expect(
      normalizeHostedStartSettings(
        {
          mode: 'go',
          boardSize: 19,
          komi: null as unknown as number,
        },
        roomsErrors,
      ),
    ).toEqual({
      mode: 'go',
      boardSize: 19,
      komi: DEFAULT_GO_KOMI,
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    });
  });

  it.each([9, 13])(
    'accepts valid go board size %i and preserves the provided komi',
    (boardSize) => {
      expect(
        normalizeHostedStartSettings(
          {
            mode: 'go',
            boardSize,
            komi: 7.5,
          },
          roomsErrors,
        ),
      ).toEqual({
        mode: 'go',
        boardSize,
        komi: 7.5,
        ruleset: GO_AREA_AGREEMENT_RULESET,
        openingRule: GO_DIGITAL_NIGIRI_OPENING,
        timeControl: DEFAULT_HOSTED_BYO_YOMI,
      });
    },
  );

  it('normalizes gomoku starts to the fixed board size and zero komi', () => {
    expect(
      normalizeHostedStartSettings(
        {
          mode: 'gomoku',
          boardSize: 15,
          komi: 6.5,
        },
        roomsErrors,
      ),
    ).toEqual({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
      openingRule: GOMOKU_FREE_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    });
  });

  it('preserves provided hosted time controls', () => {
    const timeControl = {
      type: 'byo-yomi' as const,
      mainTimeMs: 300000,
      periodTimeMs: 10000,
      periods: 3,
    };

    expect(
      normalizeHostedStartSettings(
        {
          mode: 'go',
          boardSize: 19,
          timeControl,
        },
        roomsErrors,
      ).timeControl,
    ).toBe(timeControl);
  });

  it('rejects unsupported board sizes before a match starts', () => {
    expect(() =>
      normalizeHostedStartSettings(
        {
          mode: 'go',
          boardSize: 15,
        },
        roomsErrors,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported gomoku board sizes before a match starts', () => {
    expect(() =>
      normalizeHostedStartSettings(
        {
          mode: 'gomoku',
          boardSize: 19,
        },
        roomsErrors,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported game modes', () => {
    expect(() =>
      normalizeHostedStartSettings(
        {
          mode: 'chess' as never,
          boardSize: 8,
          komi: 0,
        },
        roomsErrors,
      ),
    ).toThrow(BadRequestException);
  });

  it('builds match settings with the seated player names', () => {
    expect(
      buildHostedMatchSettings(
        {
          mode: 'gomoku',
          boardSize: 15,
          komi: 0,
        },
        'Host',
        'Guest',
      ),
    ).toEqual({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
      openingRule: GOMOKU_FREE_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
      players: {
        black: 'Host',
        white: 'Guest',
      },
    });
  });

  it('builds go match settings with rules and opening defaults', () => {
    expect(
      buildHostedMatchSettings(
        {
          mode: 'go',
          boardSize: 19,
          komi: DEFAULT_GO_KOMI,
        },
        'Host',
        'Guest',
      ),
    ).toEqual({
      mode: 'go',
      boardSize: 19,
      komi: DEFAULT_GO_KOMI,
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
      players: {
        black: 'Host',
        white: 'Guest',
      },
    });
  });
});
