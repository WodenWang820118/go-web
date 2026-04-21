import { inject, InjectionToken } from '@angular/core';
import {
  GoServerOriginLocation,
  GoServerOriginResolverService,
  GoServerOriginStorage,
} from './go-server-origin-resolver.service';

export * from './go-server-origin-resolver.service';

/**
 * The resolved backend origin used by the Angular client for REST and websocket traffic.
 *
 * Deployed builds use same-origin requests, while local Angular dev servers point at the
 * separately served `go-server` instance on port `3000`.
 */
export const GO_SERVER_ORIGIN = new InjectionToken<string>('GO_SERVER_ORIGIN');
export const GO_SERVER_ORIGIN_STORAGE_KEY = 'gx.go.serverOrigin';

/**
 * Resolves the backend origin for the current browser location.
 */
export function resolveGoServerOrigin(
  location: GoServerOriginLocation | undefined = globalThis.location,
  storage:
    | GoServerOriginStorage
    | undefined = typeof globalThis.localStorage === 'undefined'
    ? undefined
    : globalThis.localStorage,
): string {
  if (arguments.length > 0) {
    return GoServerOriginResolverService.resolveOriginValue(location, storage);
  }

  try {
    return inject(GoServerOriginResolverService).resolveOrigin(
      location,
      storage,
    );
  } catch {
    return GoServerOriginResolverService.resolveOriginValue(location, storage);
  }
}
