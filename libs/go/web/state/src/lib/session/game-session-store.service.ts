import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import {
  activateTimeControlClock,
  advanceTimeControlClock,
  completeTimeControlClockTurn,
  createTimeControlClock,
  createMessage,
  getTimeControlRemainingMs,
  GoMessageDescriptor,
  type BoardPoint,
  type GameMode,
  type MatchSettings,
  type PlayerColor,
  otherPlayer,
} from '@gx/go/domain';
import { GAME_SESSION_PORT } from './game-session.port';
import { GameRulesEngineService } from './services/game-rules-engine.service';
import { cloneSnapshot, GameSessionSnapshot } from './game-session.types';

type LocalMatchCommand =
  | {
      type: 'pass';
    }
  | {
      type: 'resign';
      player?: PlayerColor;
    }
  | {
      type: 'place';
      point: BoardPoint;
    };

/**
 * Signal-backed facade for the local, single-device game session.
 */
@Injectable({ providedIn: 'root' })
export class GameSessionStore implements OnDestroy {
  private readonly port = inject(GAME_SESSION_PORT);
  private readonly rulesEngines = inject(GameRulesEngineService);
  private readonly snapshotSignal = signal<GameSessionSnapshot | null>(
    this.port.read(),
  );
  private clockTimer: ReturnType<typeof setTimeout> | null = null;

  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly settings = computed(() => this.snapshotSignal()?.settings ?? null);
  readonly state = computed(() => this.snapshotSignal()?.state ?? null);
  readonly hasMatch = computed(() => this.snapshotSignal() !== null);
  readonly currentMode = computed(() => this.settings()?.mode ?? null);
  readonly playerNames = computed(() => this.settings()?.players ?? null);
  readonly currentPlayerName = computed(() => {
    const state = this.state();
    const names = this.playerNames();

    return state && names ? names[state.nextPlayer] : null;
  });
  readonly isScoring = computed(() => this.state()?.phase === 'scoring');
  readonly isFinished = computed(() => this.state()?.phase === 'finished');

  constructor() {
    this.scheduleClock(this.snapshotSignal());
  }

  ngOnDestroy(): void {
    this.clearClockTimer();
  }

  /**
   * Starts a new local match and persists it through the configured session port.
   */
  startMatch(settings: MatchSettings): GameSessionSnapshot {
    const startedAt = this.timestamp();
    const snapshot = {
      settings,
      state: this.rulesEngines.get(settings.mode).createInitialState(settings),
      clock:
        settings.mode === 'go' && settings.timeControl
          ? createTimeControlClock(settings.timeControl, 'black', startedAt)
          : null,
    };

    this.commit(snapshot);

    return snapshot;
  }

  restartMatch(): boolean {
    const settings = this.settings();

    if (!settings) {
      return false;
    }

    this.startMatch(settings);
    return true;
  }

  clearMatch(): void {
    this.commit(null);
  }

  hasMatchForMode(mode: GameMode): boolean {
    return this.snapshotSignal()?.settings.mode === mode;
  }

  /**
   * Applies a board click to the current local match, including dead-group toggling in scoring.
   */
  playPoint(point: BoardPoint): GoMessageDescriptor | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return createMessage('local.play.error.start_before_place');
    }

    if (snapshot.settings.mode === 'go' && snapshot.state.phase === 'scoring') {
      const engine = this.rulesEngines.get('go');
      const nextState = engine.toggleDeadGroup?.(
        snapshot.state,
        snapshot.settings,
        point,
      );

      if (!nextState) {
        return createMessage('local.play.error.scoring_preview_unavailable');
      }

      this.commit({
        ...snapshot,
        state: nextState,
      });

      return null;
    }

    return this.applyCommand({
      type: 'place',
      point,
    });
  }

  passTurn(): GoMessageDescriptor | null {
    return this.applyCommand({ type: 'pass' });
  }

  resign(player?: PlayerColor): GoMessageDescriptor | null {
    return this.applyCommand({
      type: 'resign',
      player,
    });
  }

  confirmScoring(player: PlayerColor): GoMessageDescriptor | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return createMessage('local.play.error.start_before_confirm_scoring');
    }

    if (snapshot.settings.mode !== 'go' || snapshot.state.phase !== 'scoring') {
      return createMessage('local.play.error.confirm_scoring_unavailable');
    }

    const engine = this.rulesEngines.get('go');
    const nextState = engine.confirmScoring?.(
      snapshot.state,
      snapshot.settings,
      player,
    );

    if (!nextState) {
      return createMessage('local.play.error.confirm_score_failed');
    }

    this.commit({
      ...snapshot,
      state: nextState,
    });

    return null;
  }

  disputeScoring(player: PlayerColor): GoMessageDescriptor | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return createMessage('local.play.error.start_before_dispute_scoring');
    }

    if (snapshot.settings.mode !== 'go' || snapshot.state.phase !== 'scoring') {
      return createMessage('local.play.error.dispute_scoring_unavailable');
    }

    const engine = this.rulesEngines.get('go');
    const nextState = engine.disputeScoring?.(
      snapshot.state,
      snapshot.settings,
      player,
    );

    if (!nextState) {
      return createMessage('local.play.error.dispute_score_failed');
    }

    this.commit({
      ...snapshot,
      clock:
        snapshot.clock && nextState.phase === 'playing'
          ? activateTimeControlClock(
              snapshot.clock,
              nextState.nextPlayer,
              this.timestamp(),
            )
          : snapshot.clock,
      state: nextState,
    });

    return null;
  }

  private applyCommand(command: LocalMatchCommand): GoMessageDescriptor | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return createMessage('local.play.error.start_before_move');
    }

    const clockedSnapshot = this.advanceSnapshotClock(snapshot);

    if (clockedSnapshot.state.phase === 'finished') {
      this.commit(clockedSnapshot);
      return null;
    }

    const result = this.rulesEngines
      .get(clockedSnapshot.settings.mode)
      .applyMove(clockedSnapshot.state, clockedSnapshot.settings, command);

    if (!result.ok) {
      if (clockedSnapshot !== snapshot) {
        this.commit(clockedSnapshot);
      }

      return result.error ?? createMessage('local.play.error.move_rejected');
    }

    const now = this.timestamp();
    const nextClock = clockedSnapshot.clock
      ? completeTimeControlClockTurn(
          clockedSnapshot.clock,
          result.state.nextPlayer,
          result.state.phase,
          now,
        )
      : null;

    this.commit({
      ...clockedSnapshot,
      clock: nextClock,
      state: result.state,
    });

    return null;
  }

  private commit(snapshot: GameSessionSnapshot | null): void {
    const nextSnapshot = cloneSnapshot(snapshot);
    this.port.write(nextSnapshot);
    this.snapshotSignal.set(nextSnapshot);
    this.scheduleClock(nextSnapshot);
  }

  private advanceSnapshotClock(
    snapshot: GameSessionSnapshot,
  ): GameSessionSnapshot {
    if (!snapshot.clock || snapshot.state.phase !== 'playing') {
      return snapshot;
    }

    const advanced = advanceTimeControlClock(snapshot.clock, this.timestamp());

    if (!advanced.timedOutColor) {
      return {
        ...snapshot,
        clock: advanced.clock,
      };
    }

    return {
      ...snapshot,
      clock: advanced.clock,
      state: this.createTimeoutState(snapshot, advanced.timedOutColor),
    };
  }

  private createTimeoutState(
    snapshot: GameSessionSnapshot,
    timedOutColor: PlayerColor,
  ): GameSessionSnapshot['state'] {
    const winner = otherPlayer(timedOutColor);
    const summary = createMessage('game.result.timeout', {
      winner: createMessage(`common.player.${winner}`),
      loser: createMessage(`common.player.${timedOutColor}`),
    });

    return {
      ...snapshot.state,
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

  private scheduleClock(snapshot: GameSessionSnapshot | null): void {
    this.clearClockTimer();

    if (!snapshot?.clock || snapshot.state.phase !== 'playing') {
      return;
    }

    const remainingMs = getTimeControlRemainingMs(
      snapshot.clock.players[snapshot.clock.activeColor],
      snapshot.clock.config,
    );
    this.clockTimer = setTimeout(
      () => this.resolveScheduledTimeout(),
      Math.max(0, remainingMs) + 25,
    );
  }

  private resolveScheduledTimeout(): void {
    this.clockTimer = null;

    const snapshot = this.snapshotSignal();

    if (!snapshot?.clock || snapshot.state.phase !== 'playing') {
      return;
    }

    this.commit(this.advanceSnapshotClock(snapshot));
  }

  private clearClockTimer(): void {
    if (!this.clockTimer) {
      return;
    }

    clearTimeout(this.clockTimer);
    this.clockTimer = null;
  }

  private timestamp(): string {
    return new Date().toISOString();
  }
}
