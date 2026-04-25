import '@angular/compiler';
import { Injector } from '@angular/core';
import {
  boardHash,
  cloneBoard,
  createBoard,
  DEFAULT_GO_KOMI,
  setCell,
} from '@gx/go/domain';
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

  it('uses the shared rules engine to reject unavailable Gomoku pass commands', () => {
    store.startMatch({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      players: {
        black: 'Black',
        white: 'White',
      },
    });

    expect(store.passTurn()).toMatchObject({
      key: 'game.gomoku.error.pass_unavailable',
    });
    expect(store.state()?.phase).toBe('playing');
    expect(store.state()?.moveHistory).toHaveLength(0);
  });

  it('uses the shared rules engine to reject occupied local intersections', () => {
    store.startMatch({
      mode: 'go',
      boardSize: 9,
      komi: DEFAULT_GO_KOMI,
      players: {
        black: 'Black',
        white: 'White',
      },
    });

    expect(store.playPoint({ x: 4, y: 4 })).toBeNull();

    expect(store.playPoint({ x: 4, y: 4 })).toMatchObject({
      key: 'game.error.intersection_occupied',
    });
    expect(store.state()?.moveHistory).toHaveLength(1);
    expect(store.state()?.nextPlayer).toBe('white');
  });

  it('uses the shared rules engine to reject immediate local Go ko recaptures', () => {
    store.startMatch({
      mode: 'go',
      boardSize: 9,
      komi: DEFAULT_GO_KOMI,
      players: {
        black: 'Black',
        white: 'White',
      },
    });

    const beforeKo = createBoard(9);
    setCell(beforeKo, { x: 1, y: 0 }, 'black');
    setCell(beforeKo, { x: 2, y: 0 }, 'white');
    setCell(beforeKo, { x: 0, y: 1 }, 'black');
    setCell(beforeKo, { x: 1, y: 1 }, 'white');
    setCell(beforeKo, { x: 3, y: 1 }, 'white');
    setCell(beforeKo, { x: 1, y: 2 }, 'black');
    setCell(beforeKo, { x: 2, y: 2 }, 'white');

    const afterKo = cloneBoard(beforeKo);
    setCell(afterKo, { x: 1, y: 1 }, null);
    setCell(afterKo, { x: 2, y: 1 }, 'black');

    const state = store.state();

    if (!state) {
      throw new Error('Expected a started local Go match');
    }

    state.board = afterKo;
    state.nextPlayer = 'white';
    state.previousBoardHashes = [boardHash(beforeKo), boardHash(afterKo)];

    expect(store.playPoint({ x: 1, y: 1 })).toMatchObject({
      key: 'game.go.error.ko_repeat',
    });
    expect(store.state()?.moveHistory).toHaveLength(0);
    expect(store.state()?.board[1][1]).toBeNull();
    expect(store.state()?.board[1][2]).toBe('black');
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
