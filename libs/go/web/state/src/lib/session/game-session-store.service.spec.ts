import '@angular/compiler';
import { Injector } from '@angular/core';
import {
  boardHash,
  cloneBoard,
  createBoard,
  DEFAULT_GO_KOMI,
  DEFAULT_GO_TIME_CONTROL,
  setCell,
  type TimeControlSettings,
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

  afterEach(() => {
    store.clearMatch();
    store.ngOnDestroy();
    vi.useRealTimers();
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

  it('starts timed local Go matches and advances the clock after a move', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));

    store.startMatch(
      createLocalGoSettings({
        timeControl: DEFAULT_GO_TIME_CONTROL,
      }),
    );

    vi.setSystemTime(new Date('2026-04-20T00:00:05.000Z'));

    expect(store.playPoint({ x: 4, y: 4 })).toBeNull();
    expect(store.snapshot()?.clock).toMatchObject({
      config: DEFAULT_GO_TIME_CONTROL,
      activeColor: 'white',
      lastStartedAt: '2026-04-20T00:00:05.000Z',
      players: {
        black: {
          type: 'byo-yomi',
          mainTimeMs: 30 * 60 * 1000 - 5_000,
          periodTimeMs: 30_000,
          periodsRemaining: 3,
        },
        white: {
          type: 'byo-yomi',
          mainTimeMs: 30 * 60 * 1000,
          periodTimeMs: 30_000,
          periodsRemaining: 3,
        },
      },
    });
  });

  it('finishes timed local Go matches when the active player times out', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));

    store.startMatch(
      createLocalGoSettings({
        timeControl: {
          type: 'absolute',
          mainTimeMs: 10 * 60 * 1000,
        },
      }),
    );

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 50);

    expect(store.state()).toMatchObject({
      phase: 'finished',
      result: {
        winner: 'white',
        reason: 'timeout',
        summary: {
          key: 'game.result.timeout',
        },
      },
      scoring: null,
    });
  });

  it('preserves the selected time control when restarting a local match', () => {
    const timeControl = {
      type: 'fischer' as const,
      mainTimeMs: 60 * 60 * 1000,
      incrementMs: 20 * 1000,
    };

    store.startMatch(createLocalGoSettings({ timeControl }));

    expect(store.restartMatch()).toBe(true);
    expect(store.settings()?.timeControl).toEqual(timeControl);
    expect(store.snapshot()?.clock).toMatchObject({
      config: timeControl,
      players: {
        black: {
          type: 'fischer',
          remainingMs: 60 * 60 * 1000,
        },
      },
    });
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

  it('reactivates a timed local Go clock when scoring is disputed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));

    store.startMatch(
      createLocalGoSettings({
        timeControl: DEFAULT_GO_TIME_CONTROL,
      }),
    );

    vi.setSystemTime(new Date('2026-04-20T00:00:05.000Z'));
    expect(store.passTurn()).toBeNull();

    vi.setSystemTime(new Date('2026-04-20T00:00:08.000Z'));
    expect(store.passTurn()).toBeNull();

    const scoringClock = store.snapshot()?.clock;

    vi.setSystemTime(new Date('2026-04-20T00:00:20.000Z'));
    expect(store.disputeScoring('white')).toBeNull();

    expect(store.snapshot()?.clock).toMatchObject({
      activeColor: 'white',
      lastStartedAt: '2026-04-20T00:00:20.000Z',
      revision: (scoringClock?.revision ?? 0) + 1,
    });
  });
});

function createLocalGoSettings(options: { timeControl: TimeControlSettings }) {
  return {
    mode: 'go' as const,
    boardSize: 9 as const,
    komi: DEFAULT_GO_KOMI,
    players: {
      black: 'Black',
      white: 'White',
    },
    timeControl: options.timeControl,
  };
}
