import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GoI18nService } from '@gx/go/state';
import {
  DEFAULT_GO_RULE_OPTIONS,
  DEFAULT_GO_TIME_CONTROL,
  createMessage,
} from '@gx/go/domain';
import { GameBoardComponent } from '@gx/go/ui';
import {
  createHostedMatch,
  createRoomServiceStub,
  createSeatedSnapshot,
  createSnapshot,
  queryDialog,
  queryDialogHeaderClose,
  queryVisibleDialogs,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

type OnlineRoomPageHarness = Awaited<ReturnType<typeof renderOnlineRoomPage>>;

describe('OnlineRoomPageComponent > stage and layout', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('shows waiting copy when seats are still open', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.waiting.label'));
    expect(text).toContain(i18n.t('room.stage.waiting.title'));
  });

  it('shows ready copy when both seats are filled before the match starts', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.ready.label'));
    expect(text).toContain(i18n.t('room.stage.ready.title'));
  });

  it('lets the host update the next Go match time control', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        nextMatchSettings: {
          mode: 'go',
          boardSize: 19,
          komi: 6.5,
          timeControl: DEFAULT_GO_TIME_CONTROL,
          goRules: DEFAULT_GO_RULE_OPTIONS,
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-host',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const select = await openNextMatchSettingsDialogControl<HTMLSelectElement>(
      harness,
      'time-control-preset-select',
    );

    select.value = 'bga-candidates-fischer-75-20';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();

    expect(roomService.updateNextMatchSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'go',
        boardSize: 19,
        timeControl: {
          type: 'fischer',
          mainTimeMs: 4_500_000,
          incrementMs: 20_000,
        },
      }),
    );
  });

  it('lets the host update the next Go match rule options', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        nextMatchSettings: {
          mode: 'go',
          boardSize: 19,
          komi: 6.5,
          timeControl: DEFAULT_GO_TIME_CONTROL,
          goRules: DEFAULT_GO_RULE_OPTIONS,
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-host',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const koRule = await openNextMatchSettingsDialogControl<HTMLInputElement>(
      harness,
      'room-next-match-ko-rule-positional-superko',
    );

    koRule.click();
    await harness.fixture.whenStable();

    expect(roomService.updateNextMatchSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        goRules: {
          koRule: 'positional-superko',
          scoringRule: 'area',
        },
      }),
    );

    roomService.updateNextMatchSettings.mockClear();
    roomService.snapshot.set(
      createSnapshot({
        nextMatchSettings: {
          mode: 'go',
          boardSize: 19,
          komi: 6.5,
          timeControl: DEFAULT_GO_TIME_CONTROL,
          goRules: {
            koRule: 'positional-superko',
            scoringRule: 'area',
          },
        },
      }),
    );
    harness.detectChanges();
    await harness.fixture.whenStable();

    const scoringRule = document.body.querySelector(
      '[data-testid="room-next-match-scoring-rule-japanese-territory"]',
    ) as HTMLInputElement;

    scoringRule.click();
    await harness.fixture.whenStable();

    expect(roomService.updateNextMatchSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        goRules: {
          koRule: 'positional-superko',
          scoringRule: 'japanese-territory',
        },
      }),
    );
  });

  it('dismisses the next-match settings dialog from the dialog close control', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-host',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = await openNextMatchSettingsDialog(harness);
    const i18n = TestBed.inject(GoI18nService);
    const [visibleDialog] = queryVisibleDialogs(harness);

    expect(visibleDialog?.closable).toBe(true);
    expect(visibleDialog?.dismissableMask).toBe(true);

    queryDialogHeaderClose(
      'room-next-match-dialog',
      i18n.t('common.action.close'),
    )?.click();
    await harness.fixture.whenStable();

    expect(queryDialog('room-next-match-dialog')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-settings-chip-button"]'),
    ).not.toBeNull();
    expect(roomService.updateNextMatchSettings).not.toHaveBeenCalled();
  });

  it('closes the next-match settings dialog if room settings disappear', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-host',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = await openNextMatchSettingsDialog(harness);

    roomService.snapshot.set(
      createSnapshot({
        nextMatchSettings: null,
      }),
    );
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(queryDialog('room-next-match-dialog')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-settings-chip-button"]'),
    ).toBeNull();
    expect(roomService.updateNextMatchSettings).not.toHaveBeenCalled();
  });

  it('opens pending Go nigiri in a dialog and routes guesses from the page', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        participants: [
          {
            participantId: 'host-1',
            displayName: 'Host',
            seat: 'black',
            isHost: true,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:00:00.000Z',
          },
          {
            participantId: 'guest-1',
            displayName: 'Guest',
            seat: 'white',
            isHost: false,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:01:00.000Z',
          },
        ],
        seatState: {
          black: 'host-1',
          white: 'guest-1',
        },
        nigiri: {
          status: 'pending',
          commitment: 'commitment',
          guesser: 'white',
        },
      }),
      participantId: 'guest-1',
      participantToken: 'token-guest',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const [visibleDialog] = queryVisibleDialogs(harness);
    const oddButton = document.body.querySelector(
      '[data-testid="room-nigiri-guess-odd"]',
    ) as HTMLButtonElement | null;

    expect(
      root.querySelector('[data-testid="room-sidebar-nigiri-panel"]'),
    ).toBe(null);
    expect(queryDialog('room-nigiri-dialog')).not.toBeNull();
    expect(visibleDialog?.closable).toBe(false);
    expect(visibleDialog?.dismissableMask).toBe(false);
    expect(document.body.textContent).toContain('Guest');
    expect(oddButton).not.toBeNull();

    oddButton?.click();
    await harness.fixture.whenStable();

    expect(roomService.sendGameCommand).toHaveBeenCalledWith({
      type: 'nigiri-guess',
      guess: 'odd',
    });
  });

  it('shows waiting players a dismissable pending Go nigiri dialog without guess buttons', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        participants: [
          {
            participantId: 'host-1',
            displayName: 'Host',
            seat: 'black',
            isHost: true,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:00:00.000Z',
          },
          {
            participantId: 'guest-1',
            displayName: 'Guest',
            seat: 'white',
            isHost: false,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:01:00.000Z',
          },
        ],
        seatState: {
          black: 'host-1',
          white: 'guest-1',
        },
        nigiri: {
          status: 'pending',
          commitment: 'commitment',
          guesser: 'white',
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-host',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const i18n = TestBed.inject(GoI18nService);
    const [visibleDialog] = queryVisibleDialogs(harness);
    const closeButton = queryDialogHeaderClose(
      'room-nigiri-dialog',
      i18n.t('common.action.close'),
    );

    expect(queryDialog('room-nigiri-dialog')).not.toBeNull();
    expect(visibleDialog?.closable).toBe(true);
    expect(visibleDialog?.dismissableMask).toBe(true);
    expect(document.body.textContent).toContain('Guest');
    expect(
      document.body.querySelector('[data-testid="room-nigiri-guess-odd"]'),
    ).toBeNull();
    expect(
      document.body.querySelector('[data-testid="room-nigiri-guess-even"]'),
    ).toBeNull();

    closeButton?.click();
    await harness.fixture.whenStable();

    expect(queryDialog('room-nigiri-dialog')).toBeNull();
  });

  it('shows blocked copy when auto-start is paused after a declined rematch', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot({
        overrides: {
          autoStartBlockedUntilSeatChange: true,
        },
      }),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.blocked.label'));
    expect(text).toContain(i18n.t('room.stage.blocked.title'));
  });

  it('renders the simplified sidebar with chat-integrated room info', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot({
        overrides: {
          match: createHostedMatch({
            mode: 'gomoku',
            moveHistory: [
              {
                id: 'move-1',
                moveNumber: 1,
                player: 'black',
                command: {
                  type: 'place',
                  point: { x: 7, y: 7 },
                },
                notation: 'H8',
                boardHashAfterMove: 'hash-1',
                phaseAfterMove: 'playing',
                capturedPoints: [],
                capturesAfterMove: {
                  black: 0,
                  white: 0,
                },
              },
            ],
          }),
        },
      }),
      participantId: 'guest-1',
      participantToken: 'token-guest',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const stageHost = root.querySelector('lib-go-online-room-stage-section');
    const stage = root.querySelector('[data-testid="room-stage"]');
    const boardWrap = root.querySelector('[data-testid="room-board-wrap"]');
    const stageDock = root.querySelector('[data-testid="room-stage-dock"]');
    const settingsAnchor = stageDock?.querySelector(
      '[data-testid="room-stage-settings-anchor"]',
    );
    const shareAnchor = stageDock?.querySelector(
      '[data-testid="room-stage-share-anchor"]',
    );
    const settingsChipButton = root.querySelector(
      '[data-testid="room-settings-chip-button"]',
    ) as HTMLButtonElement | null;
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;

    expect(settingsChipButton).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-compact-header"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(stageHost?.className).toContain('block');
    expect(stageHost?.className).toContain('min-h-0');
    expect(stageHost?.className).toContain('min-w-0');
    expect(
      root.querySelector('[data-testid="room-sidebar-room-id"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-share-chip"]'),
    ).not.toBeNull();
    expect(
      stage?.querySelector('[data-testid="room-share-chip"]'),
    ).not.toBeNull();
    expect(
      stage?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).not.toBeNull();
    expect(boardWrap).not.toBeNull();
    expect(stageDock).not.toBeNull();
    expect(settingsAnchor).not.toBeNull();
    expect(shareAnchor).not.toBeNull();
    expect(
      !!(
        settingsAnchor?.compareDocumentPosition(shareAnchor as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ),
    ).toBe(true);
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).toBeNull();
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-board"]'),
    ).not.toBeNull();
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-hud"]'),
    ).toBeNull();
    expect(settingsChipButton?.textContent).toContain(
      i18n.t('room.next_match.chip_label'),
    );
    expect(settingsChipButton?.getAttribute('aria-label')).toBe(
      i18n.t('room.next_match.title'),
    );
    expect(shareChipButton?.textContent).toContain(i18n.t('room.hero.share'));
    expect(shareChipButton?.getAttribute('role')).toBe('button');
    expect(shareChipButton?.getAttribute('tabindex')).toBe('0');
    expect(shareChipButton?.getAttribute('title')).toContain(
      i18n.t('room.connection.connected'),
    );
    expect(
      root.querySelector('[data-testid="room-sidebar-share-url"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-copy"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-connection"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-next-match-panel"]'),
    ).toBeNull();
    expect(
      root.querySelector(
        '[data-testid="room-next-match-readonly-time-control"]',
      ),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-move-log-panel"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat-list"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat-composer"]'),
    ).not.toBeNull();
    expect(
      root.querySelectorAll('[data-testid="room-sidebar-chat-metric"]'),
    ).toHaveLength(2);
    const blackPlayer = root.querySelector(
      '[data-testid="room-player-black"]',
    ) as HTMLElement | null;
    const whitePlayer = root.querySelector(
      '[data-testid="room-player-white"]',
    ) as HTMLElement | null;

    expect(blackPlayer).not.toBeNull();
    expect(whitePlayer).not.toBeNull();
    expect(
      blackPlayer?.querySelector('[data-testid="room-player-black-status"]'),
    ).not.toBeNull();
    expect(
      blackPlayer?.querySelector('[data-testid="room-player-black-presence"]'),
    ).not.toBeNull();
    expect(
      whitePlayer?.querySelector('[data-testid="room-player-white-status"]'),
    ).not.toBeNull();
    expect(
      whitePlayer?.querySelector('[data-testid="room-player-white-presence"]'),
    ).not.toBeNull();
    expect(blackPlayer?.textContent).not.toContain(i18n.playerLabel('black'));
    expect(whitePlayer?.textContent).not.toContain(i18n.playerLabel('white'));
    expect(root.textContent).not.toContain(
      i18n.t('room.sidebar.decorative_avatar'),
    );
  });

  it('opens next-match settings for guests in readonly mode', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot(),
      participantId: 'guest-1',
      participantToken: 'token-guest',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = await openNextMatchSettingsDialog(harness);
    const i18n = TestBed.inject(GoI18nService);
    const [visibleDialog] = queryVisibleDialogs(harness);

    expect(visibleDialog?.closable).toBe(true);
    expect(visibleDialog?.dismissableMask).toBe(true);
    expectReadonlyNextMatchDialog();
    expect(roomService.updateNextMatchSettings).not.toHaveBeenCalled();

    const closeButton = queryDialogHeaderClose(
      'room-next-match-dialog',
      i18n.t('common.action.close'),
    );

    expect(closeButton).not.toBeNull();

    closeButton?.click();
    await harness.fixture.whenStable();

    expect(queryDialog('room-next-match-dialog')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-settings-chip-button"]'),
    ).not.toBeNull();
    expect(roomService.updateNextMatchSettings).not.toHaveBeenCalled();
  });

  it('closes a guest readonly settings dialog if room settings disappear', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot(),
      participantId: 'guest-1',
      participantToken: 'token-guest',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = await openNextMatchSettingsDialog(harness);

    roomService.snapshot.set(
      createSeatedSnapshot({
        overrides: {
          nextMatchSettings: null,
        },
      }),
    );
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(queryDialog('room-next-match-dialog')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-settings-chip-button"]'),
    ).toBeNull();
    expect(roomService.updateNextMatchSettings).not.toHaveBeenCalled();
  });

  it('keeps the match status hud inside the board column while the share chip stays docked separately', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot({
        overrides: {
          match: createHostedMatch({
            mode: 'gomoku',
            phase: 'finished',
            result: {
              summary: createMessage('game.gomoku.result.five_in_row', {
                winner: createMessage('common.player.black'),
              }),
              winner: 'black',
              score: null,
            },
            message: createMessage('game.gomoku.result.five_in_row', {
              winner: createMessage('common.player.black'),
            }),
          }),
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const boardWrap = root.querySelector('[data-testid="room-board-wrap"]');
    const stageDock = root.querySelector('[data-testid="room-stage-dock"]');

    expect(
      boardWrap?.querySelector('[data-testid="room-stage-board"]'),
    ).not.toBeNull();
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-hud"]'),
    ).not.toBeNull();
    expect(stageDock).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-hud"]'),
    ).toBeNull();
  });

  it('keeps the settings chip available in the stage dock when no share URL is available', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        match: createHostedMatch(),
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
      shareUrl: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(
      root.querySelector('[data-testid="room-stage-board"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-stage-dock"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-stage-settings-anchor"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).toBeNull();
  });

  it('omits the stage dock when no share URL or settings chip is available', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        match: createHostedMatch(),
        nextMatchSettings: null,
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
      shareUrl: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(
      root.querySelector('[data-testid="room-stage-board"]'),
    ).not.toBeNull();
    expect(root.querySelector('[data-testid="room-stage-dock"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).toBeNull();
  });

  it('keeps the share chip available beneath the empty stage content before the match starts', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const stageEmpty = root.querySelector('[data-testid="room-stage-empty"]');
    const stageDock = root.querySelector('[data-testid="room-stage-dock"]');

    expect(stageEmpty).not.toBeNull();
    expect(root.querySelector('[data-testid="room-board-wrap"]')).toBeNull();
    expect(stageDock).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-settings-anchor"]'),
    ).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).not.toBeNull();
  });

  it('renders the sidebar action area below chat with back-to-lobby and without scoring agreement', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot({
        overrides: {
          match: createHostedMatch(),
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const chatSection = root.querySelector('[data-testid="room-sidebar-chat"]');
    const actionsSection = root.querySelector(
      '[data-testid="room-sidebar-actions"]',
    );

    expect(actionsSection).not.toBeNull();
    expect(actionsSection?.textContent).toContain(
      i18n.t('room.page.back_to_lobby'),
    );
    expect(actionsSection?.textContent).toContain(i18n.t('common.move.pass'));
    expect(actionsSection?.textContent).toContain(i18n.t('common.move.resign'));
    expect(actionsSection?.textContent).not.toContain(
      i18n.t('room.participants.confirm_score'),
    );
    expect(actionsSection?.textContent).not.toContain(
      i18n.t('room.participants.dispute_score'),
    );

    if (!chatSection || !actionsSection) {
      throw new Error('Expected chat and actions sections to render');
    }

    expect(
      !!(
        chatSection.compareDocumentPosition(actionsSection) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ),
    ).toBe(true);
  });

  it('restores hosted Go scoring controls and score preview from the room snapshot', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot({
        overrides: {
          match: createHostedMatch({
            phase: 'scoring',
            consecutivePasses: 2,
            message: createMessage('game.go.state.scoring_started'),
            scoring: {
              deadStones: [],
              territory: [],
              score: {
                black: 12,
                white: 18.5,
                blackStones: 12,
                whiteStones: 12,
                blackTerritory: 0,
                whiteTerritory: 0,
                blackPrisoners: 0,
                whitePrisoners: 0,
                komi: 6.5,
                scoringRule: 'area',
              },
            },
          }),
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
      canInteractBoard: true,
      connectionState: 'disconnected',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const disabledConfirmButton = root.querySelector(
      '[data-testid="room-confirm-scoring"]',
    ) as HTMLButtonElement | null;
    const disabledDisputeButton = root.querySelector(
      '[data-testid="room-dispute-scoring"]',
    ) as HTMLButtonElement | null;

    expect(root.textContent).toContain(
      i18n.t('ui.match_sidebar.score_preview'),
    );
    expect(root.textContent).toContain('12.0');
    expect(root.textContent).toContain('18.5');
    expect(disabledConfirmButton).not.toBeNull();
    expect(disabledDisputeButton).not.toBeNull();
    expect(disabledConfirmButton?.disabled).toBe(true);
    expect(disabledDisputeButton?.disabled).toBe(true);

    roomService.connectionState.set('connected');
    harness.detectChanges();
    await harness.fixture.whenStable();

    const enabledConfirmButton = root.querySelector(
      '[data-testid="room-confirm-scoring"]',
    ) as HTMLButtonElement | null;
    const enabledDisputeButton = root.querySelector(
      '[data-testid="room-dispute-scoring"]',
    ) as HTMLButtonElement | null;

    expect(enabledConfirmButton?.disabled).toBe(false);
    expect(enabledDisputeButton?.disabled).toBe(false);

    enabledConfirmButton?.click();

    expect(roomService.sendGameCommand).toHaveBeenCalledWith({
      type: 'confirm-scoring',
    });

    enabledDisputeButton?.click();

    expect(roomService.sendGameCommand).toHaveBeenCalledWith({
      type: 'dispute-scoring',
    });
    expect(roomService.snapshot()?.match?.state.phase).toBe('scoring');
  });

  it('routes hosted board selections to moves while playing and dead-stone toggles while scoring', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot({
        overrides: {
          match: createHostedMatch(),
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
      canInteractBoard: true,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const board = harness.fixture.debugElement.query(
      By.directive(GameBoardComponent),
    ).componentInstance as GameBoardComponent;

    board.pointSelected.emit({ x: 3, y: 4 });

    expect(roomService.sendGameCommand).toHaveBeenCalledWith({
      type: 'place',
      point: { x: 3, y: 4 },
    });

    roomService.sendGameCommand.mockClear();
    roomService.snapshot.set(
      createSeatedSnapshot({
        overrides: {
          match: createHostedMatch({
            phase: 'scoring',
            scoring: {
              deadStones: [],
              territory: [],
              score: {
                black: 12,
                white: 18.5,
                blackStones: 12,
                whiteStones: 12,
                blackTerritory: 0,
                whiteTerritory: 0,
                blackPrisoners: 0,
                whitePrisoners: 0,
                komi: 6.5,
                scoringRule: 'area',
              },
            },
          }),
        },
      }),
    );
    harness.detectChanges();
    await harness.fixture.whenStable();

    board.pointSelected.emit({ x: 1, y: 1 });

    expect(roomService.sendGameCommand).toHaveBeenCalledWith({
      type: 'toggle-dead',
      point: { x: 1, y: 1 },
    });
  });

  it('does not send hosted board commands when the board is not interactive', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSeatedSnapshot({
        overrides: {
          match: createHostedMatch(),
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
      canInteractBoard: false,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const board = harness.fixture.debugElement.query(
      By.directive(GameBoardComponent),
    ).componentInstance as GameBoardComponent;

    board.pointSelected.emit({ x: 3, y: 4 });

    expect(roomService.sendGameCommand).not.toHaveBeenCalled();
  });

  it('renders the missing-room state inside the new shell without the old header', async () => {
    const roomService = createRoomServiceStub({
      snapshot: null,
      participantId: null,
      participantToken: null,
      bootstrapState: 'missing',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(
      root.querySelector('[data-testid="room-compact-header"]'),
    ).toBeNull();
    expect(root.textContent).toContain(i18n.t('room.page.missing.title'));
    expect(root.textContent).toContain(i18n.t('room.page.missing.action'));
  });

  it('does not show an auto-start dialog or sidebar notice when the next match starts', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        match: createHostedMatch(),
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
      lastNotice: 'The next match has started.',
      lastSystemNotice: {
        id: 'notice-auto-start',
        message: createMessage('room.notice.match_started_auto', {
          mode: createMessage('common.mode.go'),
        }),
        createdAt: '2026-03-20T00:06:00.000Z',
      },
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(queryDialog('room-auto-start-dialog')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-auto-start-dialog"]'),
    ).toBeNull();
    expect(document.body.textContent).not.toContain(
      i18n.t('room.dialog.auto_start.title'),
    );
    expect(
      root.querySelector('[data-testid="room-sidebar-message-notice"]'),
    ).toBeNull();
  });
});

async function openNextMatchSettingsDialog(
  harness: OnlineRoomPageHarness,
): Promise<HTMLElement> {
  const root = harness.routeNativeElement as HTMLElement;
  const settingsButton = root.querySelector(
    '[data-testid="room-settings-chip-button"]',
  ) as HTMLButtonElement | null;

  expect(settingsButton).not.toBeNull();

  settingsButton?.click();
  await harness.fixture.whenStable();

  expect(queryDialog('room-next-match-dialog')).not.toBeNull();

  return root;
}

async function openNextMatchSettingsDialogControl<T extends HTMLElement>(
  harness: OnlineRoomPageHarness,
  testId: string,
): Promise<T> {
  await openNextMatchSettingsDialog(harness);

  const control = document.body.querySelector(
    `[data-testid="${testId}"]`,
  ) as T | null;

  expect(control).not.toBeNull();

  return control as T;
}

function expectReadonlyNextMatchDialog(): void {
  expect(
    document.body.querySelector('[data-testid="room-next-match-panel"]'),
  ).not.toBeNull();
  expect(
    document.body.querySelector(
      '[data-testid="room-next-match-readonly-time-control"]',
    ),
  ).not.toBeNull();
  expect(
    document.body.querySelector('[data-testid="time-control-preset-select"]'),
  ).toBeNull();
  expect(
    document.body.querySelector(
      '[data-testid="room-next-match-ko-rule-fieldset"]',
    ),
  ).toBeNull();
  expect(
    document.body.querySelector(
      '[data-testid="room-next-match-scoring-rule-fieldset"]',
    ),
  ).toBeNull();
}
