import { HostedClockSnapshot } from '@gx/go/contracts';
import {
  consumeByoYomiTime,
  createMessage,
  getByoYomiRemainingMs,
  MatchSettings,
  MatchState,
  otherPlayer,
  PlayerColor,
  TimeControlSettings,
} from '@gx/go/domain';
import { Injectable } from '@nestjs/common';

export interface ClockAdvanceResult {
  clock: HostedClockSnapshot;
  timedOutColor: PlayerColor | null;
}

@Injectable()
export class RoomsMatchClockCalculatorService {
  createHostedClock(
    settings: MatchSettings,
    startedAt: string,
  ): HostedClockSnapshot | null {
    const config = settings.timeControl ?? null;

    if (!config) {
      return null;
    }

    return {
      config,
      activeColor: 'black',
      lastStartedAt: startedAt,
      revision: 0,
      players: {
        black: this.createClockPlayer(config),
        white: this.createClockPlayer(config),
      },
    };
  }

  advanceHostedClock(
    clock: HostedClockSnapshot,
    now: string,
  ): ClockAdvanceResult {
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
    const activePlayer = consumeByoYomiTime(
      clock.players[activeColor],
      clock.config,
      elapsedMs,
    );
    const nextClock: HostedClockSnapshot = {
      ...clock,
      lastStartedAt: now,
      revision: clock.revision + 1,
      players: {
        ...clock.players,
        [activeColor]: activePlayer,
      },
    };

    return {
      clock: nextClock,
      timedOutColor:
        getByoYomiRemainingMs(activePlayer, clock.config) <= 0
          ? activeColor
          : null,
    };
  }

  completeHostedClockTurn(
    clock: HostedClockSnapshot,
    nextPlayer: PlayerColor,
    nextPhase: MatchState['phase'],
    now: string,
  ): HostedClockSnapshot {
    const activeColor = clock.activeColor;
    const activePlayer = clock.players[activeColor];
    const resetActivePlayer =
      activePlayer.mainTimeMs <= 0 && activePlayer.periodsRemaining > 0
        ? {
            ...activePlayer,
            periodTimeMs: clock.config.periodTimeMs,
          }
        : activePlayer;

    return {
      ...clock,
      activeColor: nextPhase === 'playing' ? nextPlayer : clock.activeColor,
      lastStartedAt: now,
      revision: clock.revision + 1,
      players: {
        ...clock.players,
        [activeColor]: resetActivePlayer,
      },
    };
  }

  activateHostedClock(
    clock: HostedClockSnapshot,
    activeColor: PlayerColor,
    now: string,
  ): HostedClockSnapshot {
    return {
      ...clock,
      activeColor,
      lastStartedAt: now,
      revision: clock.revision + 1,
    };
  }

  getActiveClockRemainingMs(clock: HostedClockSnapshot): number {
    return getByoYomiRemainingMs(
      clock.players[clock.activeColor],
      clock.config,
    );
  }

  createTimeoutState(
    state: MatchState,
    timedOutColor: PlayerColor,
  ): MatchState {
    const winner = otherPlayer(timedOutColor);
    const summary = createMessage('game.result.timeout', {
      winner: createMessage(`common.player.${winner}`),
      loser: createMessage(`common.player.${timedOutColor}`),
    });

    return {
      ...state,
      phase: 'finished',
      result: {
        winner,
        reason: 'timeout',
        summary,
      },
      message: summary,
      scoring: null,
    };
  }

  private createClockPlayer(config: TimeControlSettings) {
    return {
      mainTimeMs: config.mainTimeMs,
      periodTimeMs: config.periodTimeMs,
      periodsRemaining: config.periods,
    };
  }
}
