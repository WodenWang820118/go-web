export const ROOM_ID_LENGTH = 6;
export const ROOM_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_IDLE_TTL_MS = 60 * 60 * 1000;
export const THROTTLE_WINDOW_MS = 60 * 1000;
const DEFAULT_CREATE_ATTEMPTS_PER_WINDOW = 6;
const DEFAULT_JOIN_ATTEMPTS_PER_WINDOW = 12;
export const CHAT_WINDOW_MS = 10 * 1000;
export const CHAT_MESSAGES_PER_WINDOW = 5;
export const MAX_CHAT_MESSAGES = 100;
export const MAX_CHAT_LENGTH = 280;
export const MAX_DISPLAY_NAME_LENGTH = 24;

function readPositiveIntegerOverride(
  override: string | undefined,
  fallback: number,
): number {
  if (!override || !/^[1-9]\d*$/.test(override)) {
    return fallback;
  }

  return Number.parseInt(override, 10);
}

export const CREATE_ATTEMPTS_PER_WINDOW = readPositiveIntegerOverride(
  process.env.GO_ROOM_CREATE_ATTEMPTS_PER_WINDOW,
  DEFAULT_CREATE_ATTEMPTS_PER_WINDOW,
);
export const JOIN_ATTEMPTS_PER_WINDOW = readPositiveIntegerOverride(
  process.env.GO_ROOM_JOIN_ATTEMPTS_PER_WINDOW,
  DEFAULT_JOIN_ATTEMPTS_PER_WINDOW,
);
