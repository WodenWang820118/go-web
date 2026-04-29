import {
  OFFICIAL_GO_TIME_CONTROL_PRESETS,
  areTimeControlSettingsEqual,
  cloneTimeControlSettings,
  type OfficialGoTimeControlPreset,
  type TimeControlPresetSystem,
  type TimeControlSettings,
} from '@gx/go/domain';
import type { GoI18nService } from '@gx/go/state/i18n';

export interface TimeControlPresetOption {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly summary: string;
  readonly settings: TimeControlSettings;
}

export interface TimeControlPresetGroup {
  readonly system: TimeControlPresetSystem;
  readonly label: string;
  readonly options: readonly TimeControlPresetOption[];
}

const SYSTEM_ORDER: readonly TimeControlPresetSystem[] = [
  'byo-yomi',
  'fischer',
  'canadian',
  'absolute',
];

export function buildTimeControlPresetGroups(
  i18n: GoI18nService,
): TimeControlPresetGroup[] {
  return SYSTEM_ORDER.map((system) => ({
    system,
    label: i18n.t(`time_control.system.${system}`),
    options: OFFICIAL_GO_TIME_CONTROL_PRESETS.filter(
      (preset) => preset.system === system,
    ).map((preset) => toPresetOption(preset, i18n)),
  }));
}

export function findOfficialPresetForTimeControl(
  settings: TimeControlSettings,
): OfficialGoTimeControlPreset | null {
  return (
    OFFICIAL_GO_TIME_CONTROL_PRESETS.find((preset) =>
      areTimeControlSettingsEqual(preset.settings, settings),
    ) ?? null
  );
}

export function summarizeTimeControl(
  settings: TimeControlSettings,
  i18n: GoI18nService,
): string {
  switch (settings.type) {
    case 'byo-yomi':
      return i18n.t('time_control.summary.byo_yomi', {
        main: formatTimeControlDuration(settings.mainTimeMs, i18n),
        period: formatTimeControlDuration(settings.periodTimeMs, i18n),
        periods: settings.periods,
      });
    case 'fischer':
      return i18n.t('time_control.summary.fischer', {
        main: formatTimeControlDuration(settings.mainTimeMs, i18n),
        increment: formatTimeControlDuration(settings.incrementMs, i18n),
      });
    case 'canadian':
      return i18n.t('time_control.summary.canadian', {
        main: formatTimeControlDuration(settings.mainTimeMs, i18n),
        period: formatTimeControlDuration(settings.periodTimeMs, i18n),
        stones: settings.stonesPerPeriod,
      });
    case 'absolute':
      return i18n.t('time_control.summary.absolute', {
        main: formatTimeControlDuration(settings.mainTimeMs, i18n),
      });
  }
}

export function formatTimeControlDuration(
  durationMs: number,
  i18n: GoI18nService,
): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) {
    return i18n.t('time_control.duration.minutes_seconds', {
      minutes,
      seconds,
    });
  }

  if (minutes > 0) {
    return i18n.t('time_control.duration.minutes', {
      count: minutes,
    });
  }

  return i18n.t('time_control.duration.seconds', {
    count: seconds,
  });
}

function toPresetOption(
  preset: OfficialGoTimeControlPreset,
  i18n: GoI18nService,
): TimeControlPresetOption {
  return {
    id: preset.id,
    name: preset.name,
    source: preset.source,
    summary: summarizeTimeControl(preset.settings, i18n),
    settings: cloneTimeControlSettings(preset.settings),
  };
}
