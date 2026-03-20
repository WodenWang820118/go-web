import { computed, inject, Injectable, signal } from '@angular/core';
import {
  DEFAULT_PLAYER_NAMES,
  getRulesEngine,
  type BoardPoint,
  type GameMode,
  type MatchSettings,
  type PlayerColor,
} from '@org/go/domain';
import { GAME_SESSION_PORT } from './game-session.port';
import { cloneSnapshot, GameSessionSnapshot } from './game-session.types';

@Injectable({ providedIn: 'root' })
export class GameSessionStore {
  private readonly port = inject(GAME_SESSION_PORT);
  private readonly snapshotSignal = signal<GameSessionSnapshot | null>(this.port.read());

  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly settings = computed(() => this.snapshotSignal()?.settings ?? null);
  readonly state = computed(() => this.snapshotSignal()?.state ?? null);
  readonly hasMatch = computed(() => this.snapshotSignal() !== null);
  readonly currentMode = computed(() => this.settings()?.mode ?? null);
  readonly playerNames = computed(
    () => this.settings()?.players ?? DEFAULT_PLAYER_NAMES
  );
  readonly currentPlayerName = computed(() => {
    const state = this.state();
    const names = this.playerNames();

    return state ? names[state.nextPlayer] : null;
  });
  readonly isScoring = computed(() => this.state()?.phase === 'scoring');
  readonly isFinished = computed(() => this.state()?.phase === 'finished');

  startMatch(settings: MatchSettings): GameSessionSnapshot {
    const snapshot = {
      settings,
      state: getRulesEngine(settings.mode).createInitialState(settings),
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

  playPoint(point: BoardPoint): string | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return 'Start a local match before placing stones.';
    }

    if (snapshot.settings.mode === 'go' && snapshot.state.phase === 'scoring') {
      const engine = getRulesEngine('go');
      const nextState = engine.toggleDeadGroup?.(
        snapshot.state,
        snapshot.settings,
        point
      );

      if (!nextState) {
        return 'Unable to update the scoring preview.';
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

  passTurn(): string | null {
    return this.applyCommand({ type: 'pass' });
  }

  resign(player?: PlayerColor): string | null {
    return this.applyCommand({
      type: 'resign',
      player,
    });
  }

  finalizeScoring(): string | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return 'Start a local match before finalizing scoring.';
    }

    if (snapshot.settings.mode !== 'go' || snapshot.state.phase !== 'scoring') {
      return 'Scoring finalization is only available during a Go scoring phase.';
    }

    const engine = getRulesEngine('go');
    const nextState = engine.finalizeScoring?.(snapshot.state, snapshot.settings);

    if (!nextState) {
      return 'Unable to finalize this score.';
    }

    this.commit({
      ...snapshot,
      state: nextState,
    });

    return null;
  }

  private applyCommand(
    command:
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
        }
  ): string | null {
    const snapshot = this.snapshotSignal();

    if (!snapshot) {
      return 'Start a local match before making a move.';
    }

    const result = getRulesEngine(snapshot.settings.mode).applyMove(
      snapshot.state,
      snapshot.settings,
      command
    );

    if (!result.ok) {
      return result.error ?? 'Move rejected.';
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
