import {
  MatchSettings,
  MatchState,
  TimeControlClockState,
} from '@gx/go/domain';

export interface GameSessionSnapshot {
  settings: MatchSettings;
  state: MatchState;
  clock?: TimeControlClockState | null;
}

export function cloneSnapshot(
  snapshot: GameSessionSnapshot | null,
): GameSessionSnapshot | null {
  if (!snapshot) {
    return null;
  }

  return structuredClone(snapshot);
}
