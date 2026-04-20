import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { createMessage } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { vi } from 'vitest';
import { PlayPageComponent } from './play-page.component';

describe('PlayPageComponent', () => {
  it('shows the refreshed play-again actions when a local match is finished', async () => {
    const store = createGameSessionStoreStub();

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
    board: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null)),
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
    settings,
    state,
    currentPlayerName: computed(() => settings().players.black),
    playPoint: vi.fn().mockReturnValue(null),
    passTurn: vi.fn().mockReturnValue(null),
    finalizeScoring: vi.fn().mockReturnValue(null),
    resign: vi.fn().mockReturnValue(null),
    restartMatch: vi.fn().mockReturnValue(true),
    clearMatch: vi.fn(),
  };
}
