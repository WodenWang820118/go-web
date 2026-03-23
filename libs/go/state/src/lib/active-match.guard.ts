import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isGameMode } from '@org/go/domain';
import { GameSessionStore } from './game-session.store';

/**
 * Rejects routes whose `mode` parameter is not one of the supported local game modes.
 */
export const validModeGuard: CanActivateFn = route => {
  const mode = route.paramMap.get('mode');

  if (isGameMode(mode)) {
    return true;
  }

  return inject(Router).createUrlTree(['/']);
};

/**
 * Keeps `/play/:mode` behind an existing local match for the same mode.
 */
export const activeMatchGuard: CanActivateFn = route => {
  const mode = route.paramMap.get('mode');
  const router = inject(Router);

  if (!isGameMode(mode)) {
    return router.createUrlTree(['/']);
  }

  if (inject(GameSessionStore).hasMatchForMode(mode)) {
    return true;
  }

  return router.createUrlTree(['/setup', mode]);
};
