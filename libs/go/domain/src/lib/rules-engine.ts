import {
  createMessage,
  GameMode,
  MatchSettings,
  MatchState,
  MoveCommand,
  RuleResult,
} from './types';

export interface RulesEngine {
  readonly mode: GameMode;
  createInitialState(settings: MatchSettings): MatchState;
  applyMove(state: MatchState, settings: MatchSettings, command: MoveCommand): RuleResult;
  toggleDeadGroup?(state: MatchState, settings: MatchSettings, point: { x: number; y: number }): MatchState;
  finalizeScoring?(state: MatchState, settings: MatchSettings): MatchState;
}

export function success(state: MatchState): RuleResult {
  return { ok: true, state };
}

export function failure(
  state: MatchState,
  key: string,
  params?: Parameters<typeof createMessage>[1]
): RuleResult {
  return {
    ok: false,
    state,
    error: createMessage(key, params),
  };
}
