import { computed, inject, Injectable, signal } from '@angular/core';
import {
  createMessage,
  GoMessageDescriptor,
  type BoardPoint,
  type GameMode,
  type MatchSettings,
  type PlayerColor,
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
export class GameSessionStore {
  private readonly port = inject(GAME_SESSION_PORT);
  private readonly rulesEngines = inject(GameRulesEngineService);
  private readonly snapshotSignal = signal<GameSessionSnapshot | null>(
    this.port.read(),
  );

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

  /**
   * Starts a new local match and persists it through the configured session port.
   */
  startMatch(settings: MatchSettings): GameSessionSnapshot {
    const snapshot = {
      settings,
      state: this.rulesEngines.get(settings.mode).createInitialState(settings),
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

  finalizeScoring(): GoMessageDescriptor | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return createMessage('local.play.error.start_before_finalize_scoring');
    }

    if (snapshot.settings.mode !== 'go' || snapshot.state.phase !== 'scoring') {
      return createMessage('local.play.error.finalize_scoring_unavailable');
    }

    const engine = this.rulesEngines.get('go');
    const nextState = engine.finalizeScoring?.(
      snapshot.state,
      snapshot.settings,
    );

    if (!nextState) {
      return createMessage('local.play.error.finalize_score_failed');
    }

    this.commit({
      ...snapshot,
      state: nextState,
    });

    return null;
  }

  private applyCommand(command: LocalMatchCommand): GoMessageDescriptor | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return createMessage('local.play.error.start_before_move');
    }

    const result = this.rulesEngines
      .get(snapshot.settings.mode)
      .applyMove(snapshot.state, snapshot.settings, command);

    if (!result.ok) {
      return result.error ?? createMessage('local.play.error.move_rejected');
    }

    this.commit({
      ...snapshot,
      state: result.state,
    });

    return null;
  }

  private commit(snapshot: GameSessionSnapshot | null): void {
    const nextSnapshot = cloneSnapshot(snapshot);
    this.port.write(nextSnapshot);
    this.snapshotSignal.set(nextSnapshot);
  }
}
