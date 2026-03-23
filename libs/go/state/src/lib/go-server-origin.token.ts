import { InjectionToken } from '@angular/core';

/**
 * The resolved backend origin used by the Angular client for REST and websocket traffic.
 *
 * Deployed builds use same-origin requests, while local Angular dev servers point at the
 * separately served `go-server` instance on port `3000`.
 */
export const GO_SERVER_ORIGIN = new InjectionToken<string>('GO_SERVER_ORIGIN');

/**
 * Resolves the backend origin for the current browser location.
 */
export function resolveGoServerOrigin(
  location: Pick<Location, 'protocol' | 'hostname' | 'port'> | undefined = globalThis.location,
): string {
  if (!location) {
    return '';
  }

  if (location.port === '4200' || location.port === '4201') {
    return `${location.protocol}//${location.hostname}:3000`;
  }

  return '';
}
