import {
  consumeByoYomiTime,
  getByoYomiRemainingMs,
  type TimeControlPlayerClock,
} from './byo-yomi-clock';

describe('byo-yomi clock math', () => {
  const config = {
    type: 'byo-yomi' as const,
    mainTimeMs: 10_000,
    periodTimeMs: 30_000,
    periods: 5,
  };

  it('consumes main time before entering byo-yomi', () => {
    const player = createPlayer({
      mainTimeMs: 10_000,
      periodTimeMs: 30_000,
      periodsRemaining: 5,
    });

    expect(consumeByoYomiTime(player, config, 4_000)).toEqual({
      mainTimeMs: 6_000,
      periodTimeMs: 30_000,
      periodsRemaining: 5,
    });
    expect(consumeByoYomiTime(player, config, 10_000)).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 30_000,
      periodsRemaining: 5,
    });
    expect(consumeByoYomiTime(player, config, 11_000)).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 29_000,
      periodsRemaining: 5,
    });
  });

  it('rolls over byo-yomi periods without timing out early', () => {
    expect(
      consumeByoYomiTime(
        createPlayer({
          mainTimeMs: 0,
          periodTimeMs: 30_000,
          periodsRemaining: 3,
        }),
        config,
        30_000,
      ),
    ).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 30_000,
      periodsRemaining: 2,
    });

    expect(
      consumeByoYomiTime(
        createPlayer({
          mainTimeMs: 0,
          periodTimeMs: 30_000,
          periodsRemaining: 5,
        }),
        config,
        31_000,
      ),
    ).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 29_000,
      periodsRemaining: 4,
    });
  });

  it('rolls over from a partially consumed byo-yomi period', () => {
    expect(
      consumeByoYomiTime(
        createPlayer({
          mainTimeMs: 0,
          periodTimeMs: 10_000,
          periodsRemaining: 3,
        }),
        config,
        11_000,
      ),
    ).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 29_000,
      periodsRemaining: 2,
    });
  });

  it('times out when the final byo-yomi period is fully consumed', () => {
    expect(
      consumeByoYomiTime(
        createPlayer({
          mainTimeMs: 0,
          periodTimeMs: 30_000,
          periodsRemaining: 1,
        }),
        config,
        30_000,
      ),
    ).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 0,
      periodsRemaining: 0,
    });
  });

  it('exhausts the clock after all byo-yomi time is consumed', () => {
    const player = consumeByoYomiTime(
      createPlayer({
        mainTimeMs: 0,
        periodTimeMs: 30_000,
        periodsRemaining: 5,
      }),
      config,
      150_000,
    );

    expect(player).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 0,
      periodsRemaining: 0,
    });
    expect(getByoYomiRemainingMs(player, config)).toBe(0);
  });

  it('exhausts main time and all byo-yomi time in one consumption', () => {
    expect(
      consumeByoYomiTime(
        createPlayer({
          mainTimeMs: 10_000,
          periodTimeMs: 30_000,
          periodsRemaining: 5,
        }),
        config,
        160_001,
      ),
    ).toEqual({
      mainTimeMs: 0,
      periodTimeMs: 0,
      periodsRemaining: 0,
    });
  });

  it('keeps the player clock unchanged for zero or negative elapsed time', () => {
    const player = createPlayer({
      mainTimeMs: 10_000,
      periodTimeMs: 30_000,
      periodsRemaining: 5,
    });

    expect(consumeByoYomiTime(player, config, 0)).toEqual(player);
    expect(consumeByoYomiTime(player, config, -1_000)).toEqual(player);
  });

  it('reports remaining main or byo-yomi time', () => {
    expect(
      getByoYomiRemainingMs(
        createPlayer({
          mainTimeMs: 5_000,
          periodTimeMs: 10_000,
          periodsRemaining: 3,
        }),
        config,
      ),
    ).toBe(5_000);

    expect(
      getByoYomiRemainingMs(
        createPlayer({
          mainTimeMs: 0,
          periodTimeMs: 10_000,
          periodsRemaining: 3,
        }),
        config,
      ),
    ).toBe(70_000);
  });

  function createPlayer(
    player: TimeControlPlayerClock,
  ): TimeControlPlayerClock {
    return player;
  }
});
