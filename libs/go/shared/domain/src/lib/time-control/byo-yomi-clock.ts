import { type TimeControlSettings } from '../types';

export interface TimeControlPlayerClock {
  mainTimeMs: number;
  periodTimeMs: number;
  periodsRemaining: number;
}

export function consumeByoYomiTime<TPlayer extends TimeControlPlayerClock>(
  player: TPlayer,
  config: TimeControlSettings,
  elapsedMs: number,
): TPlayer {
  let remainingElapsedMs = Math.max(0, elapsedMs);
  let mainTimeMs = player.mainTimeMs;

  if (mainTimeMs > 0) {
    const mainConsumed = Math.min(mainTimeMs, remainingElapsedMs);
    mainTimeMs -= mainConsumed;
    remainingElapsedMs -= mainConsumed;
  }

  if (remainingElapsedMs <= 0) {
    return {
      ...player,
      mainTimeMs,
    };
  }

  const totalByoYomiMs = getByoYomiRemainingMs(
    {
      ...player,
      mainTimeMs: 0,
    },
    config,
  );
  const remainingByoYomiMs = totalByoYomiMs - remainingElapsedMs;

  if (remainingByoYomiMs <= 0 || config.periodTimeMs <= 0) {
    return {
      ...player,
      mainTimeMs: 0,
      periodTimeMs: 0,
      periodsRemaining: 0,
    };
  }

  const periodsRemaining = Math.ceil(remainingByoYomiMs / config.periodTimeMs);
  const periodTimeMs =
    remainingByoYomiMs - (periodsRemaining - 1) * config.periodTimeMs;

  return {
    ...player,
    mainTimeMs: 0,
    periodTimeMs,
    periodsRemaining,
  };
}

export function getByoYomiRemainingMs(
  player: TimeControlPlayerClock,
  config: TimeControlSettings,
): number {
  if (player.mainTimeMs > 0) {
    return player.mainTimeMs;
  }

  return Math.max(
    0,
    (player.periodsRemaining - 1) * config.periodTimeMs + player.periodTimeMs,
  );
}
