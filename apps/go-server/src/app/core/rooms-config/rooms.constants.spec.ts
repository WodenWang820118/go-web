import { afterEach, describe, expect, it, vi } from 'vitest';

describe('rooms.constants', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the default attempt limits when no overrides are set', async () => {
    const constants = await loadConstants();

    expect(constants.CREATE_ATTEMPTS_PER_WINDOW).toBe(6);
    expect(constants.JOIN_ATTEMPTS_PER_WINDOW).toBe(12);
  });

  it('uses positive integer env overrides for create and join limits', async () => {
    vi.stubEnv('GO_ROOM_CREATE_ATTEMPTS_PER_WINDOW', '100');
    vi.stubEnv('GO_ROOM_JOIN_ATTEMPTS_PER_WINDOW', '120');

    const constants = await loadConstants();

    expect(constants.CREATE_ATTEMPTS_PER_WINDOW).toBe(100);
    expect(constants.JOIN_ATTEMPTS_PER_WINDOW).toBe(120);
  });

  it('ignores invalid env overrides and falls back to defaults', async () => {
    vi.stubEnv('GO_ROOM_CREATE_ATTEMPTS_PER_WINDOW', '123abc');
    vi.stubEnv('GO_ROOM_JOIN_ATTEMPTS_PER_WINDOW', '0x10');

    const constants = await loadConstants();

    expect(constants.CREATE_ATTEMPTS_PER_WINDOW).toBe(6);
    expect(constants.JOIN_ATTEMPTS_PER_WINDOW).toBe(12);
  });
});

async function loadConstants() {
  vi.resetModules();
  return import('./rooms.constants');
}
