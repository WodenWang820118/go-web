import {
  type ByoYomiTimeControl,
  type CanadianTimeControl,
  type FischerTimeControl,
  type MatchPhase,
  type PlayerColor,
  type TimeControlSettings,
} from '../types';

export interface ByoYomiPlayerClock {
  type: 'byo-yomi';
  mainTimeMs: number;
  periodTimeMs: number;
  periodsRemaining: number;
}

export interface FischerPlayerClock {
  type: 'fischer';
  remainingMs: number;
}

export interface CanadianPlayerClock {
  type: 'canadian';
  mainTimeMs: number;
  periodTimeMs: number;
  stonesRemaining: number;
}

export interface AbsolutePlayerClock {
  type: 'absolute';
  remainingMs: number;
}

export type TimeControlPlayerClockState =
  | ByoYomiPlayerClock
  | FischerPlayerClock
  | CanadianPlayerClock
  | AbsolutePlayerClock;

export interface TimeControlClockState {
  config: TimeControlSettings;
  activeColor: PlayerColor;
  lastStartedAt: string;
  revision: number;
  players: Record<PlayerColor, TimeControlPlayerClockState>;
}

export interface TimeControlClockAdvanceResult<
  TClock extends TimeControlClockState,
> {
  clock: TClock;
  timedOutColor: PlayerColor | null;
}

export function createTimeControlClock(
  config: TimeControlSettings,
  activeColor: PlayerColor,
  startedAt: string,
): TimeControlClockState {
  return {
    config,
    activeColor,
    lastStartedAt: startedAt,
    revision: 0,
    players: {
      black: createTimeControlPlayerClock(config),
      white: createTimeControlPlayerClock(config),
    },
  };
}

export function createTimeControlPlayerClock(
  config: TimeControlSettings,
): TimeControlPlayerClockState {
  switch (config.type) {
    case 'byo-yomi':
      return {
        type: 'byo-yomi',
        mainTimeMs: config.mainTimeMs,
        periodTimeMs: config.periodTimeMs,
        periodsRemaining: config.periods,
      };
    case 'fischer':
      return {
        type: 'fischer',
        remainingMs: config.mainTimeMs,
      };
    case 'canadian':
      return {
        type: 'canadian',
        mainTimeMs: config.mainTimeMs,
        periodTimeMs: config.periodTimeMs,
        stonesRemaining: config.stonesPerPeriod,
      };
    case 'absolute':
      return {
        type: 'absolute',
        remainingMs: config.mainTimeMs,
      };
  }
}

export function advanceTimeControlClock<TClock extends TimeControlClockState>(
  clock: TClock,
  now: string,
): TimeControlClockAdvanceResult<TClock> {
  const elapsedMs = Math.max(
    0,
    Date.parse(now) - Date.parse(clock.lastStartedAt),
  );

  if (elapsedMs <= 0) {
    return {
      clock,
      timedOutColor: null,
    };
  }

  const activeColor = clock.activeColor;
  const activePlayer = consumeTimeControlElapsed(
    clock.players[activeColor],
    clock.config,
    elapsedMs,
  );
  const nextClock = {
    ...clock,
    lastStartedAt: now,
    revision: clock.revision + 1,
    players: {
      ...clock.players,
      [activeColor]: activePlayer,
    },
  } as TClock;

  return {
    clock: nextClock,
    timedOutColor:
      getTimeControlRemainingMs(activePlayer, clock.config) <= 0
        ? activeColor
        : null,
  };
}

export function completeTimeControlClockTurn<
  TClock extends TimeControlClockState,
>(
  clock: TClock,
  nextPlayer: PlayerColor,
  nextPhase: MatchPhase,
  now: string,
): TClock {
  const activeColor = clock.activeColor;
  const activePlayer = completeTimeControlTurn(
    clock.players[activeColor],
    clock.config,
  );

  return {
    ...clock,
    activeColor: nextPhase === 'playing' ? nextPlayer : clock.activeColor,
    lastStartedAt: now,
    revision: clock.revision + 1,
    players: {
      ...clock.players,
      [activeColor]: activePlayer,
    },
  } as TClock;
}

export function activateTimeControlClock<TClock extends TimeControlClockState>(
  clock: TClock,
  activeColor: PlayerColor,
  now: string,
): TClock {
  return {
    ...clock,
    activeColor,
    lastStartedAt: now,
    revision: clock.revision + 1,
  };
}

export function consumeTimeControlElapsed(
  player: TimeControlPlayerClockState,
  config: TimeControlSettings,
  elapsedMs: number,
): TimeControlPlayerClockState {
  const normalizedElapsedMs = Math.max(0, elapsedMs);

  if (normalizedElapsedMs <= 0) {
    return player;
  }

  switch (config.type) {
    case 'byo-yomi':
      return consumeByoYomiElapsed(
        requireClockType(player, 'byo-yomi'),
        config,
        normalizedElapsedMs,
      );
    case 'fischer':
      return consumeFischerElapsed(
        requireClockType(player, 'fischer'),
        normalizedElapsedMs,
      );
    case 'canadian':
      return consumeCanadianElapsed(
        requireClockType(player, 'canadian'),
        normalizedElapsedMs,
      );
    case 'absolute':
      return consumeAbsoluteElapsed(
        requireClockType(player, 'absolute'),
        normalizedElapsedMs,
      );
  }
}

export function completeTimeControlTurn(
  player: TimeControlPlayerClockState,
  config: TimeControlSettings,
): TimeControlPlayerClockState {
  switch (config.type) {
    case 'byo-yomi': {
      const byoYomiPlayer = requireClockType(player, 'byo-yomi');
      return byoYomiPlayer.mainTimeMs <= 0 && byoYomiPlayer.periodsRemaining > 0
        ? {
            ...byoYomiPlayer,
            periodTimeMs: config.periodTimeMs,
          }
        : byoYomiPlayer;
    }
    case 'fischer': {
      const fischerPlayer = requireClockType(player, 'fischer');
      return {
        ...fischerPlayer,
        remainingMs: fischerPlayer.remainingMs + config.incrementMs,
      };
    }
    case 'canadian': {
      const canadianPlayer = requireClockType(player, 'canadian');

      if (canadianPlayer.mainTimeMs > 0) {
        return canadianPlayer;
      }

      const stonesRemaining = canadianPlayer.stonesRemaining - 1;

      return stonesRemaining > 0
        ? {
            ...canadianPlayer,
            stonesRemaining,
          }
        : {
            ...canadianPlayer,
            periodTimeMs: config.periodTimeMs,
            stonesRemaining: config.stonesPerPeriod,
          };
    }
    case 'absolute':
      return requireClockType(player, 'absolute');
  }
}

export function getTimeControlRemainingMs(
  player: TimeControlPlayerClockState,
  config: TimeControlSettings,
): number {
  switch (config.type) {
    case 'byo-yomi':
      return getByoYomiClockRemainingMs(
        requireClockType(player, 'byo-yomi'),
        config,
      );
    case 'fischer':
      return Math.max(0, requireClockType(player, 'fischer').remainingMs);
    case 'canadian': {
      const canadianPlayer = requireClockType(player, 'canadian');
      return Math.max(
        0,
        canadianPlayer.mainTimeMs > 0
          ? canadianPlayer.mainTimeMs
          : canadianPlayer.periodTimeMs,
      );
    }
    case 'absolute':
      return Math.max(0, requireClockType(player, 'absolute').remainingMs);
  }
}

export function consumeByoYomiElapsed(
  player: ByoYomiPlayerClock,
  config: ByoYomiTimeControl,
  elapsedMs: number,
): ByoYomiPlayerClock {
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

  const totalByoYomiMs = getByoYomiClockRemainingMs(
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

export function getByoYomiClockRemainingMs(
  player: ByoYomiPlayerClock,
  config: ByoYomiTimeControl,
): number {
  if (player.mainTimeMs > 0) {
    return player.mainTimeMs;
  }

  return Math.max(
    0,
    (player.periodsRemaining - 1) * config.periodTimeMs + player.periodTimeMs,
  );
}

function consumeFischerElapsed(
  player: FischerPlayerClock,
  elapsedMs: number,
): FischerPlayerClock {
  return {
    ...player,
    remainingMs: Math.max(0, player.remainingMs - elapsedMs),
  };
}

function consumeCanadianElapsed(
  player: CanadianPlayerClock,
  elapsedMs: number,
): CanadianPlayerClock {
  let remainingElapsedMs = elapsedMs;
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

  return {
    ...player,
    mainTimeMs: 0,
    periodTimeMs: Math.max(0, player.periodTimeMs - remainingElapsedMs),
  };
}

function consumeAbsoluteElapsed(
  player: AbsolutePlayerClock,
  elapsedMs: number,
): AbsolutePlayerClock {
  return {
    ...player,
    remainingMs: Math.max(0, player.remainingMs - elapsedMs),
  };
}

function requireClockType<TType extends TimeControlPlayerClockState['type']>(
  player: TimeControlPlayerClockState,
  type: TType,
): Extract<TimeControlPlayerClockState, { type: TType }> {
  if (player.type !== type) {
    throw new Error(`Expected ${type} clock state, received ${player.type}`);
  }

  return player as Extract<TimeControlPlayerClockState, { type: TType }>;
}
