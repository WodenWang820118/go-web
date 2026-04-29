import { HostedClockSnapshot } from '@gx/go/contracts';
import {
  activateTimeControlClock,
  advanceTimeControlClock,
  completeTimeControlClockTurn,
  createMessage,
  createTimeControlClock,
  getTimeControlRemainingMs,
  MatchSettings,
  MatchState,
  otherPlayer,
  PlayerColor,
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

    return createTimeControlClock(config, 'black', startedAt);
  }

  advanceHostedClock(
    clock: HostedClockSnapshot,
    now: string,
  ): ClockAdvanceResult {
    return advanceTimeControlClock(clock, now);
  }

  completeHostedClockTurn(
    clock: HostedClockSnapshot,
    nextPlayer: PlayerColor,
    nextPhase: MatchState['phase'],
    now: string,
  ): HostedClockSnapshot {
    return completeTimeControlClockTurn(clock, nextPlayer, nextPhase, now);
  }

  activateHostedClock(
    clock: HostedClockSnapshot,
    activeColor: PlayerColor,
    now: string,
  ): HostedClockSnapshot {
    return activateTimeControlClock(clock, activeColor, now);
  }

  getActiveClockRemainingMs(clock: HostedClockSnapshot): number {
    return getTimeControlRemainingMs(
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
}
