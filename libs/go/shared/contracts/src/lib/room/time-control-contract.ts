import {
  cloneTimeControlSettings,
  DEFAULT_GO_TIME_CONTROL,
  type GameMode,
  normalizeOfficialGoTimeControl,
  type TimeControlSettings,
} from '@gx/go/domain';

export type TimeControlValidationReason =
  | 'invalid-time-control'
  | 'time-control-not-supported';

export type TimeControlValidationResult =
  | {
      ok: true;
      timeControl: TimeControlSettings | null;
    }
  | {
      ok: false;
      reason: TimeControlValidationReason;
    };

export function normalizeGameStartTimeControl(
  mode: GameMode,
  value: unknown,
): TimeControlValidationResult {
  if (mode !== 'go') {
    return value == null
      ? {
          ok: true,
          timeControl: null,
        }
      : {
          ok: false,
          reason: 'time-control-not-supported',
        };
  }

  if (value == null) {
    return {
      ok: true,
      timeControl: cloneTimeControlSettings(DEFAULT_GO_TIME_CONTROL),
    };
  }

  const normalized = normalizeOfficialGoTimeControl(value);

  return normalized
    ? {
        ok: true,
        timeControl: normalized,
      }
    : {
        ok: false,
        reason: 'invalid-time-control',
      };
}
