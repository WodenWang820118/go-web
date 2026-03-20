import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isGameMode } from '@org/go/domain';
import { GameSessionStore } from './game-session.store';

export const validModeGuard: CanActivateFn = route => {
  const mode = route.paramMap.get('mode');

  if (isGameMode(mode)) {
    return true;
  }

  return inject(Router).createUrlTree(['/']);
};

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
