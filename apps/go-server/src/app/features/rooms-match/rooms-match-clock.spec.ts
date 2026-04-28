import { HostedClockSnapshot } from '@gx/go/contracts';
import { GomokuRulesEngine, MatchSettings } from '@gx/go/domain';
import { RoomsMatchClockCalculatorService } from './rooms-match-clock';

describe('rooms-match-clock', () => {
  const startedAt = '2026-04-20T00:00:00.000Z';
  const calculator = new RoomsMatchClockCalculatorService();

  it('creates a hosted byo-yomi clock from match settings', () => {
    const clock = calculator.createHostedClock(testSettings(), startedAt);

    expect(clock).toEqual({
      config: {
        mainTimeMs: 10_000,
        periodTimeMs: 30_000,
        periods: 5,
      },
      activeColor: 'black',
      lastStartedAt: startedAt,
      revision: 0,
      players: {
        black: {
          mainTimeMs: 10_000,
          periodTimeMs: 30_000,
          periodsRemaining: 5,
        },
        white: {
          mainTimeMs: 10_000,
          periodTimeMs: 30_000,
          periodsRemaining: 5,
        },
      },
    });
  });

  it('does not create a clock when match settings omit time control', () => {
    expect(
      calculator.createHostedClock(
        {
          ...testSettings(),
          timeControl: undefined,
        },
        startedAt,
      ),
    ).toBeNull();
  });

  it('consumes main time before byo-yomi periods', () => {
    const clock = createTestHostedClock();

    const advanced = calculator.advanceHostedClock(
      clock,
      '2026-04-20T00:00:11.000Z',
    );

    expect(advanced.timedOutColor).toBeNull();
    expect(advanced.clock.players.black).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 29_000,
      periodsRemaining: 5,
    });
    expect(advanced.clock.lastStartedAt).toBe('2026-04-20T00:00:11.000Z');
  });

  it('rolls through byo-yomi periods without timing out until all periods expire', () => {
    const clock = clockInByoYomi({
      periodsRemaining: 5,
      periodTimeMs: 30_000,
    });

    const advanced = calculator.advanceHostedClock(
      clock,
      '2026-04-20T00:00:31.000Z',
    );

    expect(advanced.timedOutColor).toBeNull();
    expect(advanced.clock.players.black).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 29_000,
      periodsRemaining: 4,
    });
  });

  it('reports a timeout when main time and all byo-yomi periods are exhausted', () => {
    const clock = clockInByoYomi({
      periodsRemaining: 5,
      periodTimeMs: 30_000,
    });

    const advanced = calculator.advanceHostedClock(
      clock,
      '2026-04-20T00:02:30.000Z',
    );

    expect(advanced.timedOutColor).toBe('black');
    expect(advanced.clock.players.black).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 0,
      periodsRemaining: 0,
    });
  });

  it('resets the active byo-yomi period after a legal move', () => {
    const clock = clockInByoYomi({
      periodsRemaining: 3,
      periodTimeMs: 5_000,
    });

    const nextClock = calculator.completeHostedClockTurn(
      clock,
      'white',
      'playing',
      '2026-04-20T00:00:25.000Z',
    );

    expect(nextClock.activeColor).toBe('white');
    expect(nextClock.players.black).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 30_000,
      periodsRemaining: 3,
    });
    expect(nextClock.lastStartedAt).toBe('2026-04-20T00:00:25.000Z');
  });

  it('keeps the active player when a turn completes outside playing phase', () => {
    const clock = createTestHostedClock();

    const nextClock = calculator.completeHostedClockTurn(
      clock,
      'white',
      'scoring',
      '2026-04-20T00:00:05.000Z',
    );

    expect(nextClock.activeColor).toBe('black');
    expect(nextClock.lastStartedAt).toBe('2026-04-20T00:00:05.000Z');
    expect(nextClock.revision).toBe(clock.revision + 1);
  });

  it('activates a hosted clock for resumed play', () => {
    const clock = createTestHostedClock();

    const activated = calculator.activateHostedClock(
      clock,
      'white',
      '2026-04-20T00:00:10.000Z',
    );

    expect(activated).toMatchObject({
      activeColor: 'white',
      lastStartedAt: '2026-04-20T00:00:10.000Z',
      revision: clock.revision + 1,
    });
  });

  it('creates a finished timeout state for the opposing winner', () => {
    const state = new GomokuRulesEngine().createInitialState(testSettings());

    expect(calculator.createTimeoutState(state, 'black')).toMatchObject({
      phase: 'finished',
      result: {
        winner: 'white',
        reason: 'timeout',
        summary: {
          key: 'game.result.timeout',
        },
      },
      scoring: null,
    });
  });

  it('creates a finished timeout state when white times out', () => {
    const state = new GomokuRulesEngine().createInitialState(testSettings());

    expect(calculator.createTimeoutState(state, 'white')).toMatchObject({
      phase: 'finished',
      result: {
        winner: 'black',
        reason: 'timeout',
      },
      scoring: null,
    });
  });

  function testSettings(): MatchSettings {
    return {
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      players: {
        black: 'Black',
        white: 'White',
      },
      timeControl: {
        mainTimeMs: 10_000,
        periodTimeMs: 30_000,
        periods: 5,
      },
    };
  }

  function createTestHostedClock(): HostedClockSnapshot {
    const clock = calculator.createHostedClock(testSettings(), startedAt);

    if (!clock) {
      throw new Error('Expected test settings to create a hosted clock.');
    }

    return clock;
  }

  function clockInByoYomi(player: {
    periodsRemaining: number;
    periodTimeMs: number;
  }): HostedClockSnapshot {
    return {
      config: {
        mainTimeMs: 10_000,
        periodTimeMs: 30_000,
        periods: 5,
      },
      activeColor: 'black',
      lastStartedAt: startedAt,
      revision: 1,
      players: {
        black: {
          mainTimeMs: 0,
          ...player,
        },
        white: {
          mainTimeMs: 10_000,
          periodTimeMs: 30_000,
          periodsRemaining: 5,
        },
      },
    };
  }
});
