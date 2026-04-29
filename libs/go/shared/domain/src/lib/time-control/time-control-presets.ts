import {
  type AbsoluteTimeControl,
  type ByoYomiTimeControl,
  type CanadianTimeControl,
  DEFAULT_GO_TIME_CONTROL,
  type FischerTimeControl,
  type TimeControlSettings,
} from '../types';

export type TimeControlPresetSystem = TimeControlSettings['type'];

export interface OfficialGoTimeControlPreset {
  id: string;
  system: TimeControlPresetSystem;
  name: string;
  description: string;
  source: string;
  settings: TimeControlSettings;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const DEFAULT_GO_TIME_CONTROL_PRESET_ID = 'cwa-rapid-30-3x30';

export const OFFICIAL_GO_TIME_CONTROL_PRESETS: readonly OfficialGoTimeControlPreset[] =
  [
    {
      id: DEFAULT_GO_TIME_CONTROL_PRESET_ID,
      system: 'byo-yomi',
      name: 'CWA rapid',
      description: '30 min + 3 x 30 sec byo-yomi',
      source: 'Chinese amateur rapid rules',
      settings: DEFAULT_GO_TIME_CONTROL,
    },
    {
      id: 'wagc-60-3x30',
      system: 'byo-yomi',
      name: 'WAGC',
      description: '60 min + 3 x 30 sec byo-yomi',
      source: 'WAGC / Nihon Ki-in',
      settings: {
        type: 'byo-yomi',
        mainTimeMs: 60 * MINUTE,
        periodTimeMs: 30 * SECOND,
        periods: 3,
      },
    },
    {
      id: 'bga-durham-30-5x30',
      system: 'byo-yomi',
      name: 'BGA Durham',
      description: '30 min + 5 x 30 sec byo-yomi',
      source: 'British Go Association tournament calendar',
      settings: {
        type: 'byo-yomi',
        mainTimeMs: 30 * MINUTE,
        periodTimeMs: 30 * SECOND,
        periods: 5,
      },
    },
    {
      id: 'kpmc-pair-30-1x10',
      system: 'byo-yomi',
      name: 'KPMC pair go',
      description: '30 min + 1 x 10 sec byo-yomi',
      source: 'KPMC World Baduk Championship outline',
      settings: {
        type: 'byo-yomi',
        mainTimeMs: 30 * MINUTE,
        periodTimeMs: 10 * SECOND,
        periods: 1,
      },
    },
    {
      id: 'aga-open-fischer-60-20',
      system: 'fischer',
      name: 'AGA Open',
      description: '60 min + 20 sec per move',
      source: 'AGA Congress',
      settings: {
        type: 'fischer',
        mainTimeMs: 60 * MINUTE,
        incrementMs: 20 * SECOND,
      },
    },
    {
      id: 'bga-candidates-fischer-75-20',
      system: 'fischer',
      name: 'BGA Candidates',
      description: '75 min + 20 sec per move',
      source: 'British Go Association tournament calendar',
      settings: {
        type: 'fischer',
        mainTimeMs: 75 * MINUTE,
        incrementMs: 20 * SECOND,
      },
    },
    {
      id: 'aga-pair-fischer-30-10',
      system: 'fischer',
      name: 'AGA pair go',
      description: '30 min + 10 sec per move',
      source: 'AGA Congress',
      settings: {
        type: 'fischer',
        mainTimeMs: 30 * MINUTE,
        incrementMs: 10 * SECOND,
      },
    },
    {
      id: 'aga-canadian-30-20-5',
      system: 'canadian',
      name: 'AGA Canadian',
      description: '30 min + 20 stones / 5 min',
      source: 'AGA TD Guide / AGA Pro Qualification',
      settings: {
        type: 'canadian',
        mainTimeMs: 30 * MINUTE,
        periodTimeMs: 5 * MINUTE,
        stonesPerPeriod: 20,
      },
    },
    {
      id: 'aga-rated-sd-45',
      system: 'absolute',
      name: 'AGA rated sudden death',
      description: '45 min sudden death',
      source: 'AGA TD Guide',
      settings: {
        type: 'absolute',
        mainTimeMs: 45 * MINUTE,
      },
    },
    {
      id: 'aga-lightning-sd-10',
      system: 'absolute',
      name: 'AGA lightning',
      description: '10 min sudden death',
      source: 'AGA Congress / BGA lightning guidance',
      settings: {
        type: 'absolute',
        mainTimeMs: 10 * MINUTE,
      },
    },
  ];

export function getOfficialGoTimeControlPreset(
  presetId: string,
): OfficialGoTimeControlPreset | null {
  return (
    OFFICIAL_GO_TIME_CONTROL_PRESETS.find((preset) => preset.id === presetId) ??
    null
  );
}

export function normalizeOfficialGoTimeControl(
  value: unknown,
): TimeControlSettings | null {
  const candidate = readTimeControlSettings(value);

  if (!candidate) {
    return null;
  }

  const preset = OFFICIAL_GO_TIME_CONTROL_PRESETS.find((item) =>
    areTimeControlSettingsEqual(item.settings, candidate),
  );

  return preset ? cloneTimeControlSettings(preset.settings) : null;
}

export function isOfficialGoTimeControl(
  value: unknown,
): value is TimeControlSettings {
  return normalizeOfficialGoTimeControl(value) !== null;
}

export function areTimeControlSettingsEqual(
  left: TimeControlSettings,
  right: TimeControlSettings,
): boolean {
  if (left.type !== right.type) {
    return false;
  }

  switch (left.type) {
    case 'byo-yomi': {
      const typedRight = right as ByoYomiTimeControl;
      return (
        left.mainTimeMs === typedRight.mainTimeMs &&
        left.periodTimeMs === typedRight.periodTimeMs &&
        left.periods === typedRight.periods
      );
    }
    case 'fischer': {
      const typedRight = right as FischerTimeControl;
      return (
        left.mainTimeMs === typedRight.mainTimeMs &&
        left.incrementMs === typedRight.incrementMs
      );
    }
    case 'canadian': {
      const typedRight = right as CanadianTimeControl;
      return (
        left.mainTimeMs === typedRight.mainTimeMs &&
        left.periodTimeMs === typedRight.periodTimeMs &&
        left.stonesPerPeriod === typedRight.stonesPerPeriod
      );
    }
    case 'absolute': {
      const typedRight = right as AbsoluteTimeControl;
      return left.mainTimeMs === typedRight.mainTimeMs;
    }
  }
}

export function cloneTimeControlSettings(
  settings: TimeControlSettings,
): TimeControlSettings {
  return { ...settings };
}

function readTimeControlSettings(value: unknown): TimeControlSettings | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  switch (value.type) {
    case 'byo-yomi':
      return readByoYomiTimeControl(value);
    case 'fischer':
      return readFischerTimeControl(value);
    case 'canadian':
      return readCanadianTimeControl(value);
    case 'absolute':
      return readAbsoluteTimeControl(value);
    default:
      return null;
  }
}

function readByoYomiTimeControl(
  value: Record<string, unknown>,
): ByoYomiTimeControl | null {
  if (!hasExactKeys(value, ['type', 'mainTimeMs', 'periodTimeMs', 'periods'])) {
    return null;
  }

  if (
    !isPositiveInteger(value.mainTimeMs) ||
    !isPositiveInteger(value.periodTimeMs) ||
    !isPositiveInteger(value.periods)
  ) {
    return null;
  }

  return {
    type: 'byo-yomi',
    mainTimeMs: value.mainTimeMs,
    periodTimeMs: value.periodTimeMs,
    periods: value.periods,
  };
}

function readFischerTimeControl(
  value: Record<string, unknown>,
): FischerTimeControl | null {
  if (!hasExactKeys(value, ['type', 'mainTimeMs', 'incrementMs'])) {
    return null;
  }

  if (
    !isPositiveInteger(value.mainTimeMs) ||
    !isPositiveInteger(value.incrementMs)
  ) {
    return null;
  }

  return {
    type: 'fischer',
    mainTimeMs: value.mainTimeMs,
    incrementMs: value.incrementMs,
  };
}

function readCanadianTimeControl(
  value: Record<string, unknown>,
): CanadianTimeControl | null {
  if (
    !hasExactKeys(value, [
      'type',
      'mainTimeMs',
      'periodTimeMs',
      'stonesPerPeriod',
    ])
  ) {
    return null;
  }

  if (
    !isPositiveInteger(value.mainTimeMs) ||
    !isPositiveInteger(value.periodTimeMs) ||
    !isPositiveInteger(value.stonesPerPeriod)
  ) {
    return null;
  }

  return {
    type: 'canadian',
    mainTimeMs: value.mainTimeMs,
    periodTimeMs: value.periodTimeMs,
    stonesPerPeriod: value.stonesPerPeriod,
  };
}

function readAbsoluteTimeControl(
  value: Record<string, unknown>,
): AbsoluteTimeControl | null {
  if (!hasExactKeys(value, ['type', 'mainTimeMs'])) {
    return null;
  }

  if (!isPositiveInteger(value.mainTimeMs)) {
    return null;
  }

  return {
    type: 'absolute',
    mainTimeMs: value.mainTimeMs,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && value > 0;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    keys.length === sortedExpectedKeys.length &&
    keys.every((key, index) => key === sortedExpectedKeys[index])
  );
}
