import { DEFAULT_GO_TIME_CONTROL } from '../types';
import {
  DEFAULT_GO_TIME_CONTROL_PRESET_ID,
  getOfficialGoTimeControlPreset,
  isOfficialGoTimeControl,
  normalizeOfficialGoTimeControl,
  OFFICIAL_GO_TIME_CONTROL_PRESETS,
} from './time-control-presets';

describe('official Go time-control presets', () => {
  it('includes all supported time-control systems', () => {
    expect(
      new Set(OFFICIAL_GO_TIME_CONTROL_PRESETS.map((preset) => preset.system)),
    ).toEqual(new Set(['byo-yomi', 'fischer', 'canadian', 'absolute']));
  });

  it('uses the rapid byo-yomi preset as the default', () => {
    const preset = getOfficialGoTimeControlPreset(
      DEFAULT_GO_TIME_CONTROL_PRESET_ID,
    );

    expect(preset?.settings).toEqual(DEFAULT_GO_TIME_CONTROL);
    expect(preset?.settings).toEqual({
      type: 'byo-yomi',
      mainTimeMs: 30 * 60 * 1000,
      periodTimeMs: 30 * 1000,
      periods: 3,
    });
  });

  it('normalizes matching presets to cloned settings', () => {
    const normalized = normalizeOfficialGoTimeControl({
      type: 'fischer',
      mainTimeMs: 60 * 60 * 1000,
      incrementMs: 20 * 1000,
    });

    expect(normalized).toEqual({
      type: 'fischer',
      mainTimeMs: 60 * 60 * 1000,
      incrementMs: 20 * 1000,
    });
    expect(normalized).not.toBe(
      getOfficialGoTimeControlPreset('aga-open-fischer-60-20')?.settings,
    );
  });

  it('rejects malformed or unofficial time controls', () => {
    expect(
      normalizeOfficialGoTimeControl({
        type: 'byo-yomi',
        mainTimeMs: 10 * 60 * 1000,
        periodTimeMs: 30 * 1000,
        periods: 5,
      }),
    ).toBeNull();
    expect(
      normalizeOfficialGoTimeControl({
        type: 'absolute',
        mainTimeMs: 10 * 60 * 1000,
        label: 'extra field',
      }),
    ).toBeNull();
    expect(
      normalizeOfficialGoTimeControl({
        type: 'fischer',
        mainTimeMs: 60 * 60 * 1000,
        incrementMs: 0,
      }),
    ).toBeNull();
    expect(isOfficialGoTimeControl(null)).toBe(false);
  });
});
