import { RulesEngineRegistryService } from './rules-engine-registry';

describe('RulesEngineRegistryService', () => {
  it('returns singleton rules engine instances per mode', () => {
    const registry = new RulesEngineRegistryService();

    const goFirst = registry.get('go');
    const goSecond = registry.get('go');
    const gomoku = registry.get('gomoku');

    expect(goFirst.mode).toBe('go');
    expect(gomoku.mode).toBe('gomoku');
    expect(goFirst).toBe(goSecond);
    expect(goFirst).not.toBe(gomoku);
  });
});
