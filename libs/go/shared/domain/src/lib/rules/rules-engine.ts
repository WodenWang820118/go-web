import {
  createMessage,
  GameMode,
  MatchSettings,
  MatchState,
  MoveCommand,
  RuleResult,
} from '../types';

/**
 * Shared interface implemented by each rules engine.
 */
export interface RulesEngine {
  readonly mode: GameMode;
  createInitialState(settings: MatchSettings): MatchState;
  applyMove(state: MatchState, settings: MatchSettings, command: MoveCommand): RuleResult;
  toggleDeadGroup?(state: MatchState, settings: MatchSettings, point: { x: number; y: number }): MatchState;
  finalizeScoring?(state: MatchState, settings: MatchSettings): MatchState;
}

/**
 * Wraps a successful rules-engine transition result.
 */
export function success(state: MatchState): RuleResult {
  return { ok: true, state };
}

/**
 * Wraps a failed rules-engine transition result with a localized message descriptor.
 */
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
