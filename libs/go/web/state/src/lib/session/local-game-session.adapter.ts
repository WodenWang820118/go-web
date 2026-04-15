import { Injectable } from '@angular/core';
import { cloneSnapshot, GameSessionSnapshot } from './game-session.types';

@Injectable({ providedIn: 'root' })
export class LocalGameSessionAdapter {
  private snapshot: GameSessionSnapshot | null = null;

  read(): GameSessionSnapshot | null {
    return cloneSnapshot(this.snapshot);
  }

  write(snapshot: GameSessionSnapshot | null): void {
    this.snapshot = cloneSnapshot(snapshot);
  }

  clear(): void {
    this.snapshot = null;
  }
}
