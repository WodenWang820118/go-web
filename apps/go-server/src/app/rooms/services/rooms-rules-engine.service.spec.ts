import { RoomsRulesEngineService } from './rooms-rules-engine.service';

describe('RoomsRulesEngineService', () => {
  it('returns rules engines by mode', () => {
    const rules = new RoomsRulesEngineService();

    expect(rules.get('go').mode).toBe('go');
    expect(rules.get('gomoku').mode).toBe('gomoku');
  });
});
