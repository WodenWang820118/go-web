import {
  activateTimeControlClock,
  advanceTimeControlClock,
  completeTimeControlClockTurn,
  createTimeControlClock,
  createTimeControlPlayerClock,
  getTimeControlRemainingMs,
  type CanadianPlayerClock,
  type FischerPlayerClock,
} from './time-control-clock';

describe('time-control clock math', () => {
  const startedAt = '2026-04-29T02:00:00.000Z';

  it('creates player clocks for each supported time system', () => {
    expect(
      createTimeControlPlayerClock({
        type: 'byo-yomi',
        mainTimeMs: 10_000,
        periodTimeMs: 30_000,
        periods: 3,
      }),
    ).toEqual({
      type: 'byo-yomi',
      mainTimeMs: 10_000,
      periodTimeMs: 30_000,
      periodsRemaining: 3,
    });

    expect(
      createTimeControlPlayerClock({
        type: 'fischer',
        mainTimeMs: 10_000,
        incrementMs: 2_000,
      }),
    ).toEqual({
      type: 'fischer',
      remainingMs: 10_000,
    });

    expect(
      createTimeControlPlayerClock({
        type: 'canadian',
        mainTimeMs: 10_000,
        periodTimeMs: 30_000,
        stonesPerPeriod: 5,
      }),
    ).toEqual({
      type: 'canadian',
      mainTimeMs: 10_000,
      periodTimeMs: 30_000,
      stonesRemaining: 5,
    });

    expect(
      createTimeControlPlayerClock({
        type: 'absolute',
        mainTimeMs: 10_000,
      }),
    ).toEqual({
      type: 'absolute',
      remainingMs: 10_000,
    });
  });

  it('advances byo-yomi and resets the current period after a legal turn', () => {
    const config = {
      type: 'byo-yomi' as const,
      mainTimeMs: 10_000,
      periodTimeMs: 30_000,
      periods: 3,
    };
    const clock = createTimeControlClock(config, 'black', startedAt);
    const advanced = advanceTimeControlClock(clock, '2026-04-29T02:00:12.000Z');

    expect(advanced.timedOutColor).toBeNull();
    expect(advanced.clock.players.black).toEqual({
      type: 'byo-yomi',
      mainTimeMs: 0,
      periodTimeMs: 28_000,
      periodsRemaining: 3,
    });

    const completed = completeTimeControlClockTurn(
      advanced.clock,
      'white',
      'playing',
      '2026-04-29T02:00:12.000Z',
    );

    expect(completed.activeColor).toBe('white');
    expect(completed.players.black).toEqual({
      type: 'byo-yomi',
      mainTimeMs: 0,
      periodTimeMs: 30_000,
      periodsRemaining: 3,
    });
  });

  it('adds Fischer increment after a legal turn and not when only resuming', () => {
    const config = {
      type: 'fischer' as const,
      mainTimeMs: 10_000,
      incrementMs: 2_000,
    };
    const clock = createTimeControlClock(config, 'black', startedAt);
    const advanced = advanceTimeControlClock(clock, '2026-04-29T02:00:03.000Z');
    const completed = completeTimeControlClockTurn(
      advanced.clock,
      'white',
      'playing',
      '2026-04-29T02:00:03.000Z',
    );

    expect(completed.players.black).toEqual({
      type: 'fischer',
      remainingMs: 9_000,
    });

    const resumed = activateTimeControlClock(
      completed,
      'black',
      '2026-04-29T02:01:00.000Z',
    );

    expect(resumed.players.black).toEqual(completed.players.black);
  });

  it('tracks Canadian overtime stones and resets a completed block', () => {
    const config = {
      type: 'canadian' as const,
      mainTimeMs: 1_000,
      periodTimeMs: 5_000,
      stonesPerPeriod: 2,
    };
    const clock = createTimeControlClock(config, 'black', startedAt);
    const advanced = advanceTimeControlClock(clock, '2026-04-29T02:00:02.000Z');

    expect(advanced.clock.players.black).toEqual({
      type: 'canadian',
      mainTimeMs: 0,
      periodTimeMs: 4_000,
      stonesRemaining: 2,
    });

    const firstMove = completeTimeControlClockTurn(
      advanced.clock,
      'white',
      'playing',
      '2026-04-29T02:00:02.000Z',
    );

    expect(firstMove.players.black).toEqual({
      type: 'canadian',
      mainTimeMs: 0,
      periodTimeMs: 4_000,
      stonesRemaining: 1,
    });

    const secondMove = completeTimeControlClockTurn(
      {
        ...firstMove,
        activeColor: 'black',
      },
      'white',
      'playing',
      '2026-04-29T02:00:03.000Z',
    );

    expect(secondMove.players.black).toEqual({
      type: 'canadian',
      mainTimeMs: 0,
      periodTimeMs: 5_000,
      stonesRemaining: 2,
    });
  });

  it('times out absolute clocks at zero', () => {
    const clock = createTimeControlClock(
      {
        type: 'absolute',
        mainTimeMs: 10_000,
      },
      'black',
      startedAt,
    );
    const advanced = advanceTimeControlClock(clock, '2026-04-29T02:00:10.000Z');

    expect(advanced.timedOutColor).toBe('black');
    expect(
      getTimeControlRemainingMs(advanced.clock.players.black, clock.config),
    ).toBe(0);
  });

  it('returns the active timeout horizon for Fischer and Canadian clocks', () => {
    const fischerPlayer: FischerPlayerClock = {
      type: 'fischer',
      remainingMs: 12_000,
    };
    const canadianPlayer: CanadianPlayerClock = {
      type: 'canadian',
      mainTimeMs: 0,
      periodTimeMs: 4_000,
      stonesRemaining: 2,
    };

    expect(
      getTimeControlRemainingMs(fischerPlayer, {
        type: 'fischer',
        mainTimeMs: 30_000,
        incrementMs: 5_000,
      }),
    ).toBe(12_000);
    expect(
      getTimeControlRemainingMs(canadianPlayer, {
        type: 'canadian',
        mainTimeMs: 30_000,
        periodTimeMs: 5_000,
        stonesPerPeriod: 2,
      }),
    ).toBe(4_000);
  });
});
