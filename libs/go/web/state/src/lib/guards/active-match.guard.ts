import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { GameRouteGuardService } from './game-route-guard.service';

/**
 * Rejects routes whose `mode` parameter is not one of the supported local game modes.
 */
export const validModeGuard: CanActivateFn = route => {
  return inject(GameRouteGuardService).validateMode(route.paramMap.get('mode'));
};

/**
 * Keeps `/play/:mode` behind an existing local match for the same mode.
 */
export const activeMatchGuard: CanActivateFn = route => {
  return inject(GameRouteGuardService).requireActiveMatch(route.paramMap.get('mode'));
};
