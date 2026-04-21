import { inject, InjectionToken } from '@angular/core';
import { GameSessionSnapshot } from './game-session.types';
import { LocalGameSessionAdapter } from './local-game-session.adapter';

export interface GameSessionPort {
  read(): GameSessionSnapshot | null;
  write(snapshot: GameSessionSnapshot | null): void;
  clear(): void;
}

export const GAME_SESSION_PORT = new InjectionToken<GameSessionPort>(
  'GAME_SESSION_PORT',
  {
    factory: () => inject(LocalGameSessionAdapter),
  },
);
