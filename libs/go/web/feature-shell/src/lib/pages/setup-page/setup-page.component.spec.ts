import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_GO_TIME_CONTROL,
  GO_AREA_AGREEMENT_RULESET,
  GOMOKU_BOARD_SIZE,
  GO_DIGITAL_NIGIRI_OPENING,
  GO_BOARD_SIZES,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { GoAnalyticsService } from '@gx/go/state';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';

import { SetupPageComponent } from './setup-page.component';

@Component({
  standalone: true,
  template: '<p>Play route</p>',
})
class PlayRouteStubComponent {}

describe('SetupPageComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the hosted header and marks the active setup mode link', async () => {
    const harness = await renderSetup('/setup/go');
    const root = harness.routeNativeElement as HTMLElement;
    const goLink = root.querySelector(
      '[data-testid="hosted-header-link-setup-go"]',
    ) as HTMLAnchorElement;
    const gomokuLink = root.querySelector(
      '[data-testid="hosted-header-link-setup-gomoku"]',
    ) as HTMLAnchorElement;

    expect(goLink.getAttribute('aria-current')).toBe('page');
    expect(gomokuLink.getAttribute('aria-current')).toBeNull();
  });

  it('renders native board-size radios and komi guidance for go mode', async () => {
    const harness = await renderSetup('/setup/go');
    const i18n = TestBed.inject(GoI18nService);
    const root = harness.routeNativeElement as HTMLElement;
    const radioInputs = Array.from(
      root.querySelectorAll(
        '[data-testid="setup-board-size-group"] input[type="radio"]',
      ),
    ) as HTMLInputElement[];

    expect(radioInputs).toHaveLength(GO_BOARD_SIZES.length);
    expect(radioInputs.every((input) => input.name === 'boardSize')).toBe(true);
    expect(radioInputs.map((input) => Number(input.value))).toEqual(
      GO_BOARD_SIZES,
    );
    expect(root.querySelector('[data-testid="setup-go-komi-note"]')).not.toBe(
      null,
    );
    expect(root.textContent).toContain(
      i18n.t('setup.go_komi_note', {
        komi: DEFAULT_GO_KOMI,
      }),
    );
  });

  it('renders the fixed gomoku board notice and hides board-size radios', async () => {
    const harness = await renderSetup('/setup/gomoku');
    const i18n = TestBed.inject(GoI18nService);
    const root = harness.routeNativeElement as HTMLElement;
    const gomokuLink = root.querySelector(
      '[data-testid="hosted-header-link-setup-gomoku"]',
    ) as HTMLAnchorElement;

    expect(gomokuLink.getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('[data-testid="setup-board-size-group"]')).toBe(
      null,
    );
    expect(root.querySelector('[data-testid="setup-go-komi-note"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="setup-gomoku-fixed-board"]'),
    ).not.toBeNull();
    expect(root.textContent).toContain(
      i18n.t('setup.gomoku_fixed_board', {
        size: GOMOKU_BOARD_SIZE,
      }),
    );
  });

  it('starts a go match with the selected board size and navigates to play', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const store = createGameSessionStoreStub();
    const analytics = createAnalyticsStub();
    const harness = await renderSetup('/setup/go', store, analytics);
    const root = harness.routeNativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const blackInput = root.querySelector(
      '[data-testid="setup-black-name-input"]',
    ) as HTMLInputElement;
    const whiteInput = root.querySelector(
      '[data-testid="setup-white-name-input"]',
    ) as HTMLInputElement;
    const boardSizeInput = root.querySelector(
      '[data-testid="setup-board-size-option-13"] input',
    ) as HTMLInputElement;
    const submitButton = root.querySelector(
      '[data-testid="setup-start-match-button"]',
    ) as HTMLButtonElement;
    const nigiriOddButton = root.querySelector(
      '[data-testid="setup-nigiri-odd-button"]',
    ) as HTMLButtonElement;

    blackInput.value = 'Aki';
    blackInput.dispatchEvent(new Event('input'));
    whiteInput.value = 'Ren';
    whiteInput.dispatchEvent(new Event('input'));
    boardSizeInput.click();
    nigiriOddButton.click();
    await harness.fixture.whenStable();

    submitButton.click();
    await harness.fixture.whenStable();

    expect(store.startMatch).toHaveBeenCalledWith({
      mode: 'go',
      boardSize: 13,
      komi: DEFAULT_GO_KOMI,
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: DEFAULT_GO_TIME_CONTROL,
      players: {
        black: 'Ren',
        white: 'Aki',
      },
    });
    expect(analytics.track).toHaveBeenCalledWith({
      action_type: 'nigiri_guess',
      event: 'gx_match_action',
      game_mode: 'go',
      play_context: 'local',
    });
    expect(analytics.track).toHaveBeenCalledWith({
      board_size: 13,
      event: 'level_start',
      game_mode: 'go',
      level_name: 'local_go_13',
      play_context: 'local',
      start_source: 'setup',
    });
    expect(router.url).toBe('/play/go');
  });

  it('does not start a go match before nigiri is resolved', async () => {
    const store = createGameSessionStoreStub();
    const harness = await renderSetup('/setup/go', store);
    const root = harness.routeNativeElement as HTMLElement;
    const submitButton = root.querySelector(
      '[data-testid="setup-start-match-button"]',
    ) as HTMLButtonElement;

    expect(submitButton.disabled).toBe(true);

    submitButton.click();
    await harness.fixture.whenStable();

    expect(store.startMatch).not.toHaveBeenCalled();
  });

  it('starts a go match with the selected official time control', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const store = createGameSessionStoreStub();
    const harness = await renderSetup('/setup/go', store);
    const root = harness.routeNativeElement as HTMLElement;
    const timeControlSelect = root.querySelector(
      '[data-testid="time-control-preset-select"]',
    ) as HTMLSelectElement;
    const nigiriOddButton = root.querySelector(
      '[data-testid="setup-nigiri-odd-button"]',
    ) as HTMLButtonElement;
    const submitButton = root.querySelector(
      '[data-testid="setup-start-match-button"]',
    ) as HTMLButtonElement;

    timeControlSelect.value = 'aga-open-fischer-60-20';
    timeControlSelect.dispatchEvent(new Event('change', { bubbles: true }));
    nigiriOddButton.click();
    await harness.fixture.whenStable();

    submitButton.click();
    await harness.fixture.whenStable();

    expect(store.startMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        timeControl: {
          type: 'fischer',
          mainTimeMs: 3_600_000,
          incrementMs: 20_000,
        },
      }),
    );
  });

  it('keeps original go player order when the nigiri guess fails', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const store = createGameSessionStoreStub();
    const harness = await renderSetup('/setup/go', store);
    const root = harness.routeNativeElement as HTMLElement;
    const blackInput = root.querySelector(
      '[data-testid="setup-black-name-input"]',
    ) as HTMLInputElement;
    const whiteInput = root.querySelector(
      '[data-testid="setup-white-name-input"]',
    ) as HTMLInputElement;
    const nigiriEvenButton = root.querySelector(
      '[data-testid="setup-nigiri-even-button"]',
    ) as HTMLButtonElement;
    const submitButton = root.querySelector(
      '[data-testid="setup-start-match-button"]',
    ) as HTMLButtonElement;

    blackInput.value = 'Aki';
    blackInput.dispatchEvent(new Event('input'));
    whiteInput.value = 'Ren';
    whiteInput.dispatchEvent(new Event('input'));
    nigiriEvenButton.click();
    await harness.fixture.whenStable();

    submitButton.click();
    await harness.fixture.whenStable();

    expect(store.startMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        players: {
          black: 'Aki',
          white: 'Ren',
        },
      }),
    );
  });

  it('does not reroll local go nigiri after a result is set', async () => {
    const random = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.9);
    const store = createGameSessionStoreStub();
    const harness = await renderSetup('/setup/go', store);
    const i18n = TestBed.inject(GoI18nService);
    const root = harness.routeNativeElement as HTMLElement;
    const oddButton = root.querySelector(
      '[data-testid="setup-nigiri-odd-button"]',
    ) as HTMLButtonElement;
    const evenButton = root.querySelector(
      '[data-testid="setup-nigiri-even-button"]',
    ) as HTMLButtonElement;
    const submitButton = root.querySelector(
      '[data-testid="setup-start-match-button"]',
    ) as HTMLButtonElement;

    oddButton.click();
    await harness.fixture.whenStable();

    expect(oddButton.disabled).toBe(true);
    expect(evenButton.disabled).toBe(true);

    evenButton.click();
    await harness.fixture.whenStable();
    submitButton.click();
    await harness.fixture.whenStable();

    expect(random).toHaveBeenCalledTimes(1);
    expect(store.startMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        players: {
          black: i18n.playerLabel('white'),
          white: i18n.playerLabel('black'),
        },
      }),
    );
  });

  it('starts a gomoku match with the fixed board size and navigates to play', async () => {
    const store = createGameSessionStoreStub();
    const harness = await renderSetup('/setup/gomoku', store);
    const i18n = TestBed.inject(GoI18nService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const submitButton = root.querySelector(
      '[data-testid="setup-start-match-button"]',
    ) as HTMLButtonElement;

    submitButton.click();
    await harness.fixture.whenStable();

    expect(store.startMatch).toHaveBeenCalledWith({
      mode: 'gomoku',
      boardSize: GOMOKU_BOARD_SIZE,
      komi: 0,
      players: {
        black: i18n.playerLabel('black'),
        white: i18n.playerLabel('white'),
      },
    });
    expect(router.url).toBe('/play/gomoku');
  });
});

async function renderSetup(
  url: '/setup/go' | '/setup/gomoku',
  store = createGameSessionStoreStub(),
  analytics = createAnalyticsStub(),
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: 'setup/:mode',
          component: SetupPageComponent,
        },
        {
          path: 'play/:mode',
          component: PlayRouteStubComponent,
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
  await harness.navigateByUrl(url, SetupPageComponent);
  return harness;
}

function createGameSessionStoreStub() {
  return {
    startMatch: vi.fn(),
  };
}

function createAnalyticsStub() {
  return {
    track: vi.fn(),
  };
}
