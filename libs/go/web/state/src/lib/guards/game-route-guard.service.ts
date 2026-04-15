import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { isGameMode } from '@gx/go/domain';
import { GameSessionStore } from '../session/game-session.store';

@Injectable({ providedIn: 'root' })
export class GameRouteGuardService {
  constructor(
    private readonly router: Router,
    private readonly gameSessionStore: GameSessionStore,
  ) {}

  validateMode(mode: string | null): true | UrlTree {
    if (isGameMode(mode)) {
      return true;
    }

    return this.router.createUrlTree(['/']);
  }

  requireActiveMatch(mode: string | null): true | UrlTree {
    if (!isGameMode(mode)) {
      return this.router.createUrlTree(['/']);
    }

    if (this.gameSessionStore.hasMatchForMode(mode)) {
      return true;
    }

    return this.router.createUrlTree(['/setup', mode]);
  }
}
