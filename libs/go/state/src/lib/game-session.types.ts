import { MatchSettings, MatchState } from '@org/go/domain';

export interface GameSessionSnapshot {
  settings: MatchSettings;
  state: MatchState;
}

export function cloneSnapshot(
  snapshot: GameSessionSnapshot | null
): GameSessionSnapshot | null {
  if (!snapshot) {
    return null;
  }

  return structuredClone(snapshot);
}
