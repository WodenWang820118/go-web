import { GoRulesEngine } from './engines/go-rules-engine';
import { GomokuRulesEngine } from './engines/gomoku-rules-engine';
import { RulesEngine } from './rules/rules-engine';
import { GameMode } from './types';

/**
 * Framework-free registry for singleton rules engines.
 */
export class RulesEngineRegistryService {
  private readonly rulesEngines: Record<GameMode, RulesEngine> = {
    go: new GoRulesEngine(),
    gomoku: new GomokuRulesEngine(),
  };

  get(mode: GameMode): RulesEngine {
    return this.rulesEngines[mode];
  }
}
