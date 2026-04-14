import { InjectionToken } from '@angular/core';

/**
 * The resolved backend origin used by the Angular client for REST and websocket traffic.
 *
 * Deployed builds use same-origin requests, while local Angular dev servers point at the
 * separately served `go-server` instance on port `3000`.
 */
export const GO_SERVER_ORIGIN = new InjectionToken<string>('GO_SERVER_ORIGIN');
export const GO_SERVER_ORIGIN_STORAGE_KEY = 'gx.go.serverOrigin';

function normalizeOriginOverride(value: string | null): string {
  return value?.trim().replace(/\/+$/, '') ?? '';
}

/**
 * Resolves the backend origin for the current browser location.
 */
export function resolveGoServerOrigin(
  location: Pick<Location, 'protocol' | 'hostname' | 'port'> | undefined = globalThis.location,
  storage:
    | Pick<Storage, 'getItem'>
    | undefined = typeof globalThis.localStorage === 'undefined'
    ? undefined
    : globalThis.localStorage,
): string {
  if (!location) {
    return '';
  }

  const override = normalizeOriginOverride(
    storage?.getItem(GO_SERVER_ORIGIN_STORAGE_KEY) ?? null
  );

  if (override) {
    return override;
  }

  if (location.port === '4200' || location.port === '4201') {
    return `${location.protocol}//${location.hostname}:3000`;
  }

  return '';
}
