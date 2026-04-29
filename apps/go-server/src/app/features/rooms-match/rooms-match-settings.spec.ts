import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_GO_TIME_CONTROL,
  DEFAULT_HOSTED_BYO_YOMI,
  GOMOKU_FREE_OPENING,
  GOMOKU_STANDARD_EXACT_FIVE_RULESET,
  GO_AREA_AGREEMENT_RULESET,
  GO_DIGITAL_NIGIRI_OPENING,
} from '@gx/go/domain';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsMatchSettingsService } from './rooms-match-settings';

describe('rooms-match-settings', () => {
  const roomsErrors = new RoomsErrorsService();
  const service = new RoomsMatchSettingsService(roomsErrors);

  it('defaults go komi when a valid go start omits it', () => {
    expect(
      service.normalizeHostedStartSettings({
        mode: 'go',
        boardSize: 19,
      }),
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
      service.normalizeHostedStartSettings({
        mode: 'go',
        boardSize: 19,
        komi: Number.NaN,
      }),
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
      service.normalizeHostedStartSettings({
        mode: 'go',
        boardSize: 19,
        komi: null as unknown as number,
      }),
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
        service.normalizeHostedStartSettings({
          mode: 'go',
          boardSize,
          komi: 7.5,
        }),
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
      service.normalizeHostedStartSettings({
        mode: 'gomoku',
        boardSize: 15,
        komi: 6.5,
      }),
    ).toEqual({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
      openingRule: GOMOKU_FREE_OPENING,
      timeControl: null,
    });
  });

  it('normalizes official Go time controls', () => {
    const timeControl = {
      type: 'fischer' as const,
      mainTimeMs: 60 * 60 * 1000,
      incrementMs: 20 * 1000,
    };

    expect(
      service.normalizeHostedStartSettings({
        mode: 'go',
        boardSize: 19,
        timeControl,
      }).timeControl,
    ).toEqual(timeControl);
  });

  it('rejects unofficial Go time controls', () => {
    expect(() =>
      service.normalizeHostedStartSettings({
        mode: 'go',
        boardSize: 19,
        timeControl: {
          type: 'byo-yomi',
          mainTimeMs: 10 * 60 * 1000,
          periodTimeMs: 30 * 1000,
          periods: 5,
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects time controls for Gomoku starts', () => {
    expect(() =>
      service.normalizeHostedStartSettings({
        mode: 'gomoku',
        boardSize: 15,
        timeControl: DEFAULT_GO_TIME_CONTROL,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported board sizes before a match starts', () => {
    expect(() =>
      service.normalizeHostedStartSettings({
        mode: 'go',
        boardSize: 15,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported gomoku board sizes before a match starts', () => {
    expect(() =>
      service.normalizeHostedStartSettings({
        mode: 'gomoku',
        boardSize: 19,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported game modes', () => {
    expect(() =>
      service.normalizeHostedStartSettings({
        mode: 'chess' as never,
        boardSize: 8,
        komi: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('builds match settings with the seated player names', () => {
    expect(
      service.buildHostedMatchSettings(
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
      timeControl: null,
      players: {
        black: 'Host',
        white: 'Guest',
      },
    });
  });

  it('builds go match settings with rules and opening defaults', () => {
    expect(
      service.buildHostedMatchSettings(
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
