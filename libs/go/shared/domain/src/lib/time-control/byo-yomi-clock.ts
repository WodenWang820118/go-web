import { type ByoYomiTimeControl } from '../types';
import {
  consumeByoYomiElapsed,
  getByoYomiClockRemainingMs,
} from './time-control-clock';

export interface TimeControlPlayerClock {
  mainTimeMs: number;
  periodTimeMs: number;
  periodsRemaining: number;
}

/**
 * @deprecated Use consumeTimeControlElapsed from time-control-clock instead.
 */
export function consumeByoYomiTime<TPlayer extends TimeControlPlayerClock>(
  player: TPlayer,
  config: ByoYomiTimeControl,
  elapsedMs: number,
): TPlayer {
  const result = consumeByoYomiElapsed(
    {
      type: 'byo-yomi',
      ...player,
    },
    config,
    elapsedMs,
  );

  return {
    ...player,
    mainTimeMs: result.mainTimeMs,
    periodTimeMs: result.periodTimeMs,
    periodsRemaining: result.periodsRemaining,
  };
}

/**
 * @deprecated Use getTimeControlRemainingMs from time-control-clock instead.
 */
export function getByoYomiRemainingMs(
  player: TimeControlPlayerClock,
  config: ByoYomiTimeControl,
): number {
  return getByoYomiClockRemainingMs(
    {
      type: 'byo-yomi',
      ...player,
    },
    config,
  );
}
