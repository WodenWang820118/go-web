import { GameRulesEngineService } from './game-rules-engine.service';

describe('GameRulesEngineService', () => {
  it('returns rules engines by mode', () => {
    const rules = new GameRulesEngineService();

    expect(rules.get('go').mode).toBe('go');
    expect(rules.get('gomoku').mode).toBe('gomoku');
  });
});
