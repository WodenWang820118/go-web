import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createMessage,
  type ScoringState,
  type TimeControlClockState,
} from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { vi } from 'vitest';
import { PlayPageComponent } from './play-page.component';

describe('PlayPageComponent', () => {
  it('renders local Go play inside the hosted-style stage layout', async () => {
    const store = createGameSessionStoreStub({
      boardSize: 19,
      phase: 'playing',
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'play/:mode',
            component: PlayPageComponent,
          },
        ]),
        {
          provide: GameSessionStore,
          useValue: store,
        },
        {
          provide: GoAnalyticsService,
          useValue: createAnalyticsStub(),
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play/go', PlayPageComponent);
    const root = harness.routeNativeElement as HTMLElement;
    const layout = root.querySelector('[data-testid="local-play-layout"]');
    const stage = root.querySelector('[data-testid="local-play-stage"]');
    const stageBoard = stage?.querySelector(
      '[data-testid="local-stage-board"]',
    );
    const sidebar = layout?.querySelector('[data-testid="local-play-sidebar"]');
    const board = stageBoard?.querySelector('[data-testid="game-board"]');

    expect(layout?.classList.contains('local-play-layout')).toBe(true);
    expect(stage?.classList.contains('local-play-stage')).toBe(true);
    expect(stageBoard).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(board).not.toBeNull();
    expect(board?.getAttribute('aria-rowcount')).toBe('19');
  });

  it('renders local Gomoku play with the same board-first stage layout', async () => {
    const store = createGameSessionStoreStub({
      boardSize: 15,
      mode: 'gomoku',
      phase: 'playing',
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'play/:mode',
            component: PlayPageComponent,
          },
        ]),
        {
          provide: GameSessionStore,
          useValue: store,
        },
        {
          provide: GoAnalyticsService,
          useValue: createAnalyticsStub(),
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play/gomoku', PlayPageComponent);
    const root = harness.routeNativeElement as HTMLElement;
    const layout = root.querySelector('[data-testid="local-play-layout"]');
    const stage = root.querySelector('[data-testid="local-play-stage"]');
    const stageBoard = stage?.querySelector(
      '[data-testid="local-stage-board"]',
    );
    const sidebar = layout?.querySelector('[data-testid="local-play-sidebar"]');
    const board = stageBoard?.querySelector('[data-testid="game-board"]');

    expect(layout?.classList.contains('local-play-layout')).toBe(true);
    expect(stage?.classList.contains('local-play-stage')).toBe(true);
    expect(stageBoard).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(board).not.toBeNull();
    expect(board?.getAttribute('aria-rowcount')).toBe('15');
  });

  it('shows the refreshed play-again actions when a local match is finished', async () => {
    const store = createGameSessionStoreStub();
    const analytics = createAnalyticsStub();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'play/:mode',
            component: PlayPageComponent,
          },
          {
            path: 'setup/:mode',
            component: PlayPageComponent,
          },
        ]),
        {
          provide: GameSessionStore,
          useValue: store,
        },
        {
          provide: GoAnalyticsService,
          useValue: analytics,
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play/go', PlayPageComponent);

    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(root.textContent).toContain(i18n.t('play.play_again_prompt'));
    expect(root.textContent).toContain(i18n.t('play.play_again_action'));
    expect(root.textContent).toContain(i18n.t('play.change_setup_action'));
    expect(root.querySelector('[data-testid="local-clock-panel"]')).toBeNull();
  });

  it('tracks local match action events with safe low-cardinality payloads', async () => {
    const store = createGameSessionStoreStub();
    const analytics = createAnalyticsStub();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'play/:mode',
            component: PlayPageComponent,
          },
          {
            path: 'setup/:mode',
            component: PlayPageComponent,
          },
        ]),
        {
          provide: GameSessionStore,
          useValue: store,
        },
        {
          provide: GoAnalyticsService,
          useValue: analytics,
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play/go', PlayPageComponent);
    const component = harness.routeDebugElement
      ?.componentInstance as PlayPageComponent & {
      confirmAction: () => void;
      confirmScoring: (player: 'black') => void;
      disputeScoring: (player: 'black') => void;
      openNewMatchConfirm: () => void;
      passTurn: () => void;
      resignMatch: () => void;
      restartMatch: () => void;
    };

    component.passTurn();
    component.confirmScoring('black');
    component.disputeScoring('black');
    component.resignMatch();
    component.confirmAction();
    component.restartMatch();
    component.confirmAction();
    component.openNewMatchConfirm();
    component.confirmAction();
    await harness.fixture.whenStable();

    expect(analytics.track.mock.calls.map(([event]) => event)).toEqual([
      {
        action_type: 'pass',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'local',
      },
      {
        action_type: 'confirm_scoring',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'local',
      },
      {
        action_type: 'dispute_scoring',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'local',
      },
      {
        action_type: 'resign',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'local',
      },
      {
        action_type: 'restart',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'local',
      },
      {
        action_type: 'new_setup',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'local',
      },
    ]);
  });

  it('renders and ticks the local match clock for the selected time system', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T00:00:00.000Z'));
    let harness: RouterTestingHarness | null = null;

    try {
      const store = createGameSessionStoreStub({
        phase: 'playing',
        clock: createFischerClock(),
      });
      const analytics = createAnalyticsStub();

      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'play/:mode',
              component: PlayPageComponent,
            },
          ]),
          {
            provide: GameSessionStore,
            useValue: store,
          },
          {
            provide: GoAnalyticsService,
            useValue: analytics,
          },
        ],
      });

      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/play/go', PlayPageComponent);

      const root = harness.routeNativeElement as HTMLElement;
      const clockPanel = root.querySelector(
        '[data-testid="local-clock-panel"]',
      );
      const blackClock = root.querySelector(
        '[data-testid="local-clock-black"]',
      );
      const whiteClock = root.querySelector(
        '[data-testid="local-clock-white"]',
      );

      expect(clockPanel?.textContent).toContain('Fischer +0:20');
      expect(blackClock?.textContent).toContain('1:00');
      expect(whiteClock?.textContent).toContain('1:00');

      vi.advanceTimersByTime(1000);
      harness.fixture.detectChanges();

      expect(blackClock?.textContent).toContain('0:59');
      expect(whiteClock?.textContent).toContain('1:00');
    } finally {
      harness?.fixture.destroy();
      vi.useRealTimers();
    }
  });

  it('projects non-Fischer local clocks through the play-page tick loop', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T00:00:00.000Z'));
    let harness: RouterTestingHarness | null = null;

    try {
      const store = createGameSessionStoreStub({
        phase: 'playing',
        clock: createAbsoluteClock(),
      });
      const analytics = createAnalyticsStub();

      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'play/:mode',
              component: PlayPageComponent,
            },
          ]),
          {
            provide: GameSessionStore,
            useValue: store,
          },
          {
            provide: GoAnalyticsService,
            useValue: analytics,
          },
        ],
      });

      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/play/go', PlayPageComponent);

      const root = harness.routeNativeElement as HTMLElement;
      const blackClock = root.querySelector(
        '[data-testid="local-clock-black"]',
      );
      const whiteClock = root.querySelector(
        '[data-testid="local-clock-white"]',
      );

      expect(blackClock?.textContent).toContain('0:10');
      expect(whiteClock?.textContent).toContain('0:10');

      vi.advanceTimersByTime(1000);
      harness.fixture.detectChanges();

      expect(blackClock?.textContent).toContain('0:09');
      expect(whiteClock?.textContent).toContain('0:10');
    } finally {
      harness?.fixture.destroy();
      vi.useRealTimers();
    }
  });

  it('stops the local clock ticker when active play pauses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T00:00:00.000Z'));
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    let harness: RouterTestingHarness | null = null;

    try {
      const store = createGameSessionStoreStub({
        phase: 'playing',
        clock: createFischerClock(),
      });
      const analytics = createAnalyticsStub();

      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'play/:mode',
              component: PlayPageComponent,
            },
          ]),
          {
            provide: GameSessionStore,
            useValue: store,
          },
          {
            provide: GoAnalyticsService,
            useValue: analytics,
          },
        ],
      });

      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/play/go', PlayPageComponent);

      store.setPhase('scoring');
      harness.fixture.detectChanges();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    } finally {
      harness?.fixture.destroy();
      vi.useRealTimers();
    }
  });

  it('shows Japanese scoring prisoner points in the local score preview', async () => {
    const store = createGameSessionStoreStub({
      phase: 'scoring',
      scoring: {
        deadStones: [],
        territory: [],
        score: {
          black: 12,
          white: 18.5,
          blackStones: 0,
          whiteStones: 0,
          blackTerritory: 9,
          whiteTerritory: 12,
          blackPrisoners: 3,
          whitePrisoners: 0,
          komi: 6.5,
          scoringRule: 'japanese-territory',
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'play/:mode',
            component: PlayPageComponent,
          },
        ]),
        {
          provide: GameSessionStore,
          useValue: store,
        },
        {
          provide: GoAnalyticsService,
          useValue: createAnalyticsStub(),
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play/go', PlayPageComponent);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(root.textContent).toContain(
      i18n.t('go_rules.scoring_rule.japanese_territory'),
    );
    expect(root.textContent).toContain(
      i18n.t('ui.match_sidebar.prisoner_points', {
        black: 3,
        white: 0,
      }),
    );
  });

  it('clears the local clock ticker on destroy', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T00:00:00.000Z'));
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    let harness: RouterTestingHarness | null = null;

    try {
      const store = createGameSessionStoreStub({
        phase: 'playing',
        clock: createFischerClock(),
      });
      const analytics = createAnalyticsStub();

      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'play/:mode',
              component: PlayPageComponent,
            },
          ]),
          {
            provide: GameSessionStore,
            useValue: store,
          },
          {
            provide: GoAnalyticsService,
            useValue: analytics,
          },
        ],
      });

      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/play/go', PlayPageComponent);
      harness.fixture.destroy();
      harness = null;

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    } finally {
      harness?.fixture.destroy();
      vi.useRealTimers();
    }
  });
});

function createFischerClock(): TimeControlClockState {
  return {
    config: {
      type: 'fischer',
      mainTimeMs: 60_000,
      incrementMs: 20_000,
    },
    activeColor: 'black',
    lastStartedAt: '2026-04-29T00:00:00.000Z',
    revision: 1,
    players: {
      black: {
        type: 'fischer',
        remainingMs: 60_000,
      },
      white: {
        type: 'fischer',
        remainingMs: 60_000,
      },
    },
  };
}

function createAbsoluteClock(): TimeControlClockState {
  return {
    config: {
      type: 'absolute',
      mainTimeMs: 10_000,
    },
    activeColor: 'black',
    lastStartedAt: '2026-04-29T00:00:00.000Z',
    revision: 1,
    players: {
      black: {
        type: 'absolute',
        remainingMs: 10_000,
      },
      white: {
        type: 'absolute',
        remainingMs: 10_000,
      },
    },
  };
}

function createGameSessionStoreStub(
  options: {
    boardSize?: 9 | 13 | 15 | 19;
    clock?: TimeControlClockState | null;
    mode?: 'go' | 'gomoku';
    phase?: 'finished' | 'playing' | 'scoring';
    scoring?: ScoringState | null;
  } = {},
) {
  const mode = options.mode ?? 'go';
  const boardSize = options.boardSize ?? 9;
  const settings = signal({
    mode,
    boardSize,
    komi: 6.5,
    players: {
      black: 'Host',
      white: 'Guest',
    },
    timeControl: options.clock?.config ?? null,
  });
  const phase = options.phase ?? 'finished';
  const state = signal({
    mode,
    boardSize,
    board: Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => null),
    ),
    phase,
    nextPlayer: 'black' as const,
    captures: {
      black: 0,
      white: 0,
    },
    moveHistory: [],
    previousBoardHashes: [],
    result: phase === 'finished' ? createFinishedResult() : null,
    lastMove: null,
    consecutivePasses: 2,
    winnerLine: [],
    message: createMessage('game.result.win_by_points', {
      winner: createMessage('common.player.black'),
      margin: '2.5',
    }),
    scoring: options.scoring ?? null,
  });

  return {
    snapshot: computed(() => ({
      settings: settings(),
      state: state(),
      clock: options.clock ?? null,
    })),
    settings,
    state,
    currentPlayerName: computed(() => settings().players.black),
    playPoint: vi.fn().mockReturnValue(null),
    passTurn: vi.fn().mockReturnValue(null),
    confirmScoring: vi.fn().mockReturnValue(null),
    disputeScoring: vi.fn().mockReturnValue(null),
    resign: vi.fn().mockReturnValue(null),
    restartMatch: vi.fn().mockReturnValue(true),
    clearMatch: vi.fn(),
    setPhase: (nextPhase: 'finished' | 'playing' | 'scoring') => {
      state.update((current) => ({
        ...current,
        phase: nextPhase,
        result: nextPhase === 'finished' ? createFinishedResult() : null,
      }));
    },
  };
}

function createFinishedResult() {
  return {
    summary: createMessage('game.result.win_by_points', {
      winner: createMessage('common.player.black'),
      margin: '2.5',
    }),
    winner: 'black' as const,
    reason: 'score' as const,
    score: {
      black: 30.5,
      white: 28,
    },
  };
}

function createAnalyticsStub() {
  return {
    track: vi.fn(),
    trackOnce: vi.fn(),
  };
}
