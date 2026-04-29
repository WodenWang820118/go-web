import { describe, expect, it } from 'vitest';
import type { GoI18nService } from '@gx/go/state/i18n';
import {
  formatTimeControlClockMs,
  formatTimeControlClockPlayer,
} from './time-control-presentation';

describe('time-control presentation', () => {
  it('formats byo-yomi main time and period countdowns', () => {
    const i18n = createI18nStub();

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'byo-yomi',
          mainTimeMs: 60_000,
          periodTimeMs: 30_000,
          periodsRemaining: 5,
        },
        {
          type: 'byo-yomi',
          mainTimeMs: 600_000,
          periodTimeMs: 30_000,
          periods: 5,
        },
        i18n,
      ),
    ).toEqual({
      label: '1:00',
      detail: 'room.clock.main',
    });

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'byo-yomi',
          mainTimeMs: 0,
          periodTimeMs: 10_000,
          periodsRemaining: 2,
        },
        {
          type: 'byo-yomi',
          mainTimeMs: 600_000,
          periodTimeMs: 30_000,
          periods: 5,
        },
        i18n,
      ),
    ).toEqual({
      label: '0:40',
      detail: 'room.clock.byo_yomi_periods:count=2',
    });

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'byo-yomi',
          mainTimeMs: 0,
          periodTimeMs: 0,
          periodsRemaining: 0,
        },
        {
          type: 'byo-yomi',
          mainTimeMs: 600_000,
          periodTimeMs: 30_000,
          periods: 5,
        },
        i18n,
      ),
    ).toEqual({
      label: '0:00',
      detail: 'room.clock.byo_yomi_periods:count=0',
    });
  });

  it('formats Fischer clocks with increment detail', () => {
    const i18n = createI18nStub();

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'fischer',
          remainingMs: 65_000,
        },
        {
          type: 'fischer',
          mainTimeMs: 300_000,
          incrementMs: 20_000,
        },
        i18n,
      ),
    ).toEqual({
      label: '1:05',
      detail: 'room.clock.fischer_increment:increment=0:20',
    });

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'fischer',
          remainingMs: 0,
        },
        {
          type: 'fischer',
          mainTimeMs: 300_000,
          incrementMs: 20_000,
        },
        i18n,
      ),
    ).toEqual({
      label: '0:00',
      detail: 'room.clock.fischer_increment:increment=0:20',
    });
  });

  it('formats Canadian main time and stones countdowns', () => {
    const i18n = createI18nStub();

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'canadian',
          mainTimeMs: 60_000,
          periodTimeMs: 300_000,
          stonesRemaining: 20,
        },
        {
          type: 'canadian',
          mainTimeMs: 600_000,
          periodTimeMs: 300_000,
          stonesPerPeriod: 20,
        },
        i18n,
      ),
    ).toEqual({
      label: '1:00',
      detail: 'room.clock.main',
    });

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'canadian',
          mainTimeMs: 0,
          periodTimeMs: 120_000,
          stonesRemaining: 5,
        },
        {
          type: 'canadian',
          mainTimeMs: 600_000,
          periodTimeMs: 300_000,
          stonesPerPeriod: 20,
        },
        i18n,
      ),
    ).toEqual({
      label: '2:00',
      detail: 'room.clock.canadian_stones:count=5',
    });

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'canadian',
          mainTimeMs: 0,
          periodTimeMs: 0,
          stonesRemaining: 0,
        },
        {
          type: 'canadian',
          mainTimeMs: 600_000,
          periodTimeMs: 300_000,
          stonesPerPeriod: 20,
        },
        i18n,
      ),
    ).toEqual({
      label: '0:00',
      detail: 'room.clock.canadian_stones:count=0',
    });
  });

  it('formats absolute sudden death clocks', () => {
    const i18n = createI18nStub();

    expect(
      formatTimeControlClockPlayer(
        {
          type: 'absolute',
          remainingMs: 45_000,
        },
        {
          type: 'absolute',
          mainTimeMs: 600_000,
        },
        i18n,
      ),
    ).toEqual({
      label: '0:45',
      detail: 'room.clock.absolute',
    });
  });

  it('formats clock milliseconds with ceiling semantics', () => {
    expect(formatTimeControlClockMs(0)).toBe('0:00');
    expect(formatTimeControlClockMs(999)).toBe('0:01');
    expect(formatTimeControlClockMs(60_000)).toBe('1:00');
    expect(formatTimeControlClockMs(3_661_000)).toBe('61:01');
  });
});

function createI18nStub(): GoI18nService {
  return {
    t: (key: string, params?: Record<string, number | string>) =>
      params
        ? `${key}:${Object.entries(params)
            .map(([paramKey, value]) => `${paramKey}=${value}`)
            .join(',')}`
        : key,
  } as GoI18nService;
}
