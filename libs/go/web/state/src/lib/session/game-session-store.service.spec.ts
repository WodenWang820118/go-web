import '@angular/compiler';
import { Injector } from '@angular/core';
import { DEFAULT_GO_KOMI } from '@gx/go/domain';
import { GAME_SESSION_PORT, type GameSessionPort } from './game-session.port';
import { GameSessionStore } from './game-session-store.service';
import { GameRulesEngineService } from './services/game-rules-engine.service';
import { cloneSnapshot, type GameSessionSnapshot } from './game-session.types';

class MemorySessionPort implements GameSessionPort {
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

describe('GameSessionStore', () => {
  let store: GameSessionStore;

  beforeEach(() => {
    const injector = Injector.create({
      providers: [
        GameSessionStore,
        GameRulesEngineService,
        {
          provide: GAME_SESSION_PORT,
          useClass: MemorySessionPort,
        },
      ],
    });

    store = injector.get(GameSessionStore);
  });

  it('requires both local Go players to confirm scoring before finishing', () => {
    store.startMatch({
      mode: 'go',
      boardSize: 9,
      komi: DEFAULT_GO_KOMI,
      players: {
        black: 'Black',
        white: 'White',
      },
    });

    expect(store.passTurn()).toBeNull();
    expect(store.passTurn()).toBeNull();
    expect(store.confirmScoring('black')).toBeNull();

    expect(store.state()?.phase).toBe('scoring');
    expect(store.state()?.scoring?.confirmedBy).toEqual(['black']);

    expect(store.confirmScoring('white')).toBeNull();

    expect(store.state()?.phase).toBe('finished');
    expect(store.state()?.result).toMatchObject({
      winner: 'white',
      reason: 'score',
    });
  });

  it('resumes a local Go match when scoring is disputed', () => {
    store.startMatch({
      mode: 'go',
      boardSize: 9,
      komi: DEFAULT_GO_KOMI,
      players: {
        black: 'Black',
        white: 'White',
      },
    });

    expect(store.passTurn()).toBeNull();
    expect(store.passTurn()).toBeNull();
    expect(store.confirmScoring('black')).toBeNull();
    expect(store.disputeScoring('white')).toBeNull();

    expect(store.state()?.phase).toBe('playing');
    expect(store.state()?.nextPlayer).toBe('white');
    expect(store.state()?.scoring).toBeNull();
    expect(store.state()?.consecutivePasses).toBe(0);
  });
});
