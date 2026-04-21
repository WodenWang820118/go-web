import { MatchSettings, MatchState } from '@gx/go/domain';

export interface GameSessionSnapshot {
  settings: MatchSettings;
  state: MatchState;
}

export function cloneSnapshot(
  snapshot: GameSessionSnapshot | null,
): GameSessionSnapshot | null {
  if (!snapshot) {
    return null;
  }

  return structuredClone(snapshot);
}
