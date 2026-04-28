import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { createMessage } from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { vi } from 'vitest';
import { PlayPageComponent } from './play-page.component';

describe('PlayPageComponent', () => {
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
});

function createGameSessionStoreStub() {
  const settings = signal({
    mode: 'go' as const,
    boardSize: 9 as const,
    komi: 6.5,
    players: {
      black: 'Host',
      white: 'Guest',
    },
  });
  const state = signal({
    mode: 'go' as const,
    boardSize: 9 as const,
    board: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => null),
    ),
    phase: 'finished' as const,
    nextPlayer: 'black' as const,
    captures: {
      black: 0,
      white: 0,
    },
    moveHistory: [],
    previousBoardHashes: [],
    result: {
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
    },
    lastMove: null,
    consecutivePasses: 2,
    winnerLine: [],
    message: createMessage('game.result.win_by_points', {
      winner: createMessage('common.player.black'),
      margin: '2.5',
    }),
    scoring: null,
  });

  return {
    snapshot: computed(() => ({
      settings: settings(),
      state: state(),
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
  };
}

function createAnalyticsStub() {
  return {
    track: vi.fn(),
    trackOnce: vi.fn(),
  };
}
