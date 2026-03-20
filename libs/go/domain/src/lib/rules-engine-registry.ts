import { GoRulesEngine } from './go-rules-engine';
import { GomokuRulesEngine } from './gomoku-rules-engine';
import { RulesEngine } from './rules-engine';
import { GameMode } from './types';

const GO_RULES_ENGINE = new GoRulesEngine();
const GOMOKU_RULES_ENGINE = new GomokuRulesEngine();

const RULES_ENGINES: Record<GameMode, RulesEngine> = {
  go: GO_RULES_ENGINE,
  gomoku: GOMOKU_RULES_ENGINE,
};

export function getRulesEngine(mode: GameMode): RulesEngine {
  return RULES_ENGINES[mode];
}
