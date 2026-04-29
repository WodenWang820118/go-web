import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DEFAULT_GO_TIME_CONTROL } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state';
import { throwError } from 'rxjs';
import { vi } from 'vitest';

import { OnlineLobbyFlashNoticeService } from '../services/online-lobby-flash-notice/online-lobby-flash-notice.service';
import {
  createLobbyRoom,
  createAnalyticsStub,
  createLobbyServiceStub,
  createLobbySnapshot,
  createOnlineParticipant,
  createRoomServiceStub,
  fillLobbyDisplayName,
  renderLobby,
} from './online-lobby-page.test-support';

describe('OnlineLobbyPageComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body
      .querySelectorAll('.p-dialog-mask, .p-dialog')
      .forEach((element) => element.remove());
  });

  it('shows the room panel plus announcement and online-player panels when the lobby is empty', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const i18n = TestBed.inject(GoI18nService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(lobbyService.refresh).toHaveBeenCalledTimes(1);
    expect(roomService.clearTransientMessages).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-testid="lobby-action-bar"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="lobby-room-panel"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="lobby-announcement-panel"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="lobby-online-players-panel"]'),
    ).not.toBeNull();
    expect(root.textContent).toContain(i18n.t('lobby.panel.announcement'));
  });

  it('opens the create-room settings dialog before creating a room', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).not.toHaveBeenCalled();
    expect(queryCreateRoomDialog()).not.toBeNull();
    expect(queryCreateRoomMode('go').checked).toBe(true);
    expect(queryCreateRoomBoardSize(19).checked).toBe(true);
  });

  it('creates a default go room from the dialog and redirects into the room detail page', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub({
      createRoomResponse: {
        roomId: 'ROOM42',
        participantId: 'host-1',
        participantToken: 'token-1',
        snapshot: createLobbySnapshot('ROOM42'),
      },
    });

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomDialogConfirm().click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith(
      'Captain',
      'go',
      19,
      DEFAULT_GO_TIME_CONTROL,
    );
    expect(router.url).toBe('/online/room/ROOM42');
  });

  it('creates a go room with the selected 13-line board size', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomBoardSize(13).click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomDialogConfirm().click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith(
      'Captain',
      'go',
      13,
      DEFAULT_GO_TIME_CONTROL,
    );
    expect(router.url).toBe('/online/room/ROOM01');
  });

  it('creates a go room with the selected official time control', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomTimeControl().value = 'aga-canadian-30-20-5';
    queryCreateRoomTimeControl().dispatchEvent(
      new Event('change', { bubbles: true }),
    );
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomDialogConfirm().click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith('Captain', 'go', 19, {
      type: 'canadian',
      mainTimeMs: 1_800_000,
      periodTimeMs: 300_000,
      stonesPerPeriod: 20,
    });
  });

  it('creates a go room with the selected 9-line board size', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomBoardSize(9).click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomDialogConfirm().click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith(
      'Captain',
      'go',
      9,
      DEFAULT_GO_TIME_CONTROL,
    );
    expect(router.url).toBe('/online/room/ROOM01');
  });

  it('creates a gomoku room with the fixed 15-line board size', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomMode('gomoku').click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    const fixedBoardSize = queryCreateRoomFixedBoardSize();
    expect(fixedBoardSize).not.toBeNull();
    expect(fixedBoardSize?.textContent).toContain('15 x 15');
    expect(queryCreateRoomBoardSizeOrNull(9)).toBeNull();
    expect(queryCreateRoomBoardSizeOrNull(13)).toBeNull();
    expect(queryCreateRoomBoardSizeOrNull(19)).toBeNull();

    queryCreateRoomDialogConfirm().click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith(
      'Captain',
      'gomoku',
      15,
    );
  });

  it('resets go board size to 19 after switching away and back to go', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomBoardSize(13).click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomMode('gomoku').click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomMode('go').click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomDialogConfirm().click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith(
      'Captain',
      'go',
      19,
      DEFAULT_GO_TIME_CONTROL,
    );
  });

  it('does not create or navigate when the create-room dialog is canceled', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomDialogCancel().click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).not.toHaveBeenCalled();
    expect(queryCreateRoomDialog()).toBeNull();
    expect(router.url).toBe('/');
  });

  it('keeps the create controls inside the room panel instead of a separate top header', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const roomPanel = root.querySelector(
      '[data-testid="lobby-room-panel"]',
    ) as HTMLElement;
    const input = roomPanel.querySelector(
      '[data-testid="lobby-display-name-input"]',
    ) as HTMLInputElement;

    expect(root.querySelector('[data-testid="lobby-action-bar"]')).toBeNull();
    expect(input).not.toBeNull();
    expect(input.value).toBe('');
    expect(
      roomPanel.querySelector('[data-testid="online-lobby-create-button"]'),
    ).not.toBeNull();
  });

  it('joins a room from the desktop action column', async () => {
    const lobbyService = createLobbyServiceStub(
      [
        createLobbyRoom({
          roomId: 'READY7',
          hostDisplayName: 'Ready Host',
          status: 'ready',
          players: {
            black: 'Ready Host',
            white: 'Guest Ready',
          },
          participantCount: 2,
          onlineCount: 2,
          spectatorCount: 0,
        }),
      ],
      [],
    );
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const joinButton = root.querySelector(
      '[data-testid="online-lobby-row-action-READY7"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    joinButton.click();
    await harness.fixture.whenStable();

    expect(roomService.joinRoom).toHaveBeenCalledWith(
      'READY7',
      'Captain',
      'lobby',
    );
    expect(router.url).toBe('/online/room/READY7');
  });

  it('tracks safe lobby filter, room open, and join content events', async () => {
    const analytics = createAnalyticsStub();
    const lobbyService = createLobbyServiceStub(
      [
        createLobbyRoom({ roomId: 'LIVE42', status: 'live' }),
        createLobbyRoom({
          roomId: 'READY7',
          hostDisplayName: 'Ready Host',
          status: 'ready',
        }),
      ],
      [],
    );
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(
      lobbyService,
      roomService,
      'desktop',
      analytics,
    );
    const root = harness.routeNativeElement as HTMLElement;
    const readyTab = root.querySelector(
      '[data-testid="lobby-tab-ready"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    readyTab.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    const openLink = root.querySelector(
      '[data-testid="online-lobby-open-READY7"]',
    ) as HTMLAnchorElement;
    const joinButton = root.querySelector(
      '[data-testid="online-lobby-row-action-READY7"]',
    ) as HTMLButtonElement;

    openLink.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    openLink.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    joinButton.click();
    await harness.fixture.whenStable();

    expect(analytics.track).toHaveBeenCalledWith({
      event: 'gx_lobby_filter_change',
      room_status: 'ready',
    });
    expect(analytics.track).toHaveBeenCalledWith({
      content_id: 'room_open',
      content_type: 'online_room',
      event: 'select_content',
      room_status: 'ready',
    });
    expect(analytics.track).toHaveBeenCalledWith({
      content_id: 'room_join',
      content_type: 'online_room',
      event: 'select_content',
      room_status: 'ready',
    });
  });

  it('renders online players grouped by activity with room and role badges', async () => {
    const lobbyService = createLobbyServiceStub(
      [createLobbyRoom({ roomId: 'LIVE42', status: 'live' })],
      [
        createOnlineParticipant({
          participantId: 'p1',
          displayName: 'Live Host',
          roomId: 'LIVE42',
          seat: 'black',
          isHost: true,
          activity: 'playing',
        }),
        createOnlineParticipant({
          participantId: 'p2',
          displayName: 'Watcher',
          roomId: 'LIVE42',
          seat: null,
          isHost: false,
          activity: 'watching',
        }),
      ],
    );
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(
      root.querySelector('[data-testid="lobby-online-group-playing"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="lobby-online-group-watching"]'),
    ).not.toBeNull();
    expect(root.textContent).toContain('Live Host');
    expect(root.textContent).toContain('#LIVE42');
  });

  it('prioritizes room errors over lobby errors in the fixed message rail', async () => {
    const lobbyService = createLobbyServiceStub([], [], {
      lastError: 'Lobby failed',
    });
    const roomService = createRoomServiceStub({
      lastError: 'Room failed',
    });

    const harness = await renderLobby(lobbyService, roomService);
    const rail = harness.routeNativeElement?.querySelector(
      '[data-testid="lobby-message-rail"]',
    ) as HTMLElement;

    expect(rail.textContent).toContain('Room failed');
    expect(rail.textContent).not.toContain('Lobby failed');
  });

  it('shows a one-time lobby flash notice when there are no active errors', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const flashNotice = TestBed.inject(OnlineLobbyFlashNoticeService);
    const rail = harness.routeNativeElement?.querySelector(
      '[data-testid="lobby-message-rail"]',
    ) as HTMLElement;

    flashNotice.show('The host closed the room.', 10000);
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(rail.textContent).toContain('The host closed the room.');
  });

  it('renders stacked mobile cards plus announcement and online-player panels', async () => {
    const lobbyService = createLobbyServiceStub(
      [
        createLobbyRoom({
          roomId: 'WAIT42',
          hostDisplayName: 'Waiting Host',
        }),
      ],
      [
        createOnlineParticipant({
          participantId: 'watcher-1',
          displayName: 'Watcher',
          roomId: 'WAIT42',
        }),
      ],
    );
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService, 'mobile');
    const root = harness.routeNativeElement as HTMLElement;

    expect(
      root.querySelector('[data-testid="lobby-mobile-room-WAIT42"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="lobby-announcement-panel"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="lobby-online-players-panel"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="online-lobby-selected-room"]'),
    ).toBeNull();
  });

  it('joins from the inline mobile CTA', async () => {
    const lobbyService = createLobbyServiceStub(
      [
        createLobbyRoom({
          roomId: 'WAIT42',
          hostDisplayName: 'Waiting Host',
        }),
      ],
      [],
    );
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService, 'mobile');
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const primaryAction = root.querySelector(
      '[data-testid="online-lobby-mobile-primary-WAIT42"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    primaryAction.click();
    await harness.fixture.whenStable();

    expect(roomService.joinRoom).toHaveBeenCalledWith(
      'WAIT42',
      'Captain',
      'lobby',
    );
    expect(router.url).toBe('/online/room/WAIT42');
  });

  it('does not navigate when room creation fails', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub({
      createRoomResult: throwError(() => new Error('create failed')),
      lastError: 'Create failed',
    });

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    queryCreateRoomDialogConfirm().click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith(
      'Captain',
      'go',
      19,
      DEFAULT_GO_TIME_CONTROL,
    );
    expect(
      harness.routeNativeElement?.querySelector(
        '[data-testid="lobby-message-rail"]',
      )?.textContent,
    ).toContain('Create failed');
    expect(router.url).toBe('/');
  });

  it('does not navigate when joining a room fails', async () => {
    const lobbyService = createLobbyServiceStub(
      [
        createLobbyRoom({
          roomId: 'READY7',
          hostDisplayName: 'Ready Host',
          status: 'ready',
        }),
      ],
      [],
    );
    const roomService = createRoomServiceStub({
      joinRoomResult: throwError(() => new Error('join failed')),
    });

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const joinButton = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-row-action-READY7"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    joinButton.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/');
  });

  it('keeps the locale switcher beside local actions without the lobby label', async () => {
    const analytics = createAnalyticsStub();
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(
      lobbyService,
      roomService,
      'desktop',
      analytics,
    );
    const router = TestBed.inject(Router);
    const i18n = TestBed.inject(GoI18nService);
    const root = harness.routeNativeElement as HTMLElement;
    const actions = root.querySelector(
      'nav[aria-label="Hosted actions"]',
    ) as HTMLElement;
    const localeSwitcherHost = actions.lastElementChild as HTMLElement;
    const goLink = root.querySelector(
      'a[href="/setup/go"]',
    ) as HTMLAnchorElement;
    const gomokuLink = root.querySelector(
      'a[href="/setup/gomoku"]',
    ) as HTMLAnchorElement;

    expect(
      root.querySelector('[data-testid="locale-switcher"]'),
    ).not.toBeNull();
    expect(actions.textContent).not.toContain(i18n.t('hosted.header.lobby'));
    expect(root.textContent).toContain(i18n.t('hosted.header.start_local_go'));
    expect(root.textContent).toContain(
      i18n.t('hosted.header.start_local_gomoku'),
    );
    expect(localeSwitcherHost.tagName.toLowerCase()).toBe(
      'lib-go-locale-switcher',
    );
    expect(
      localeSwitcherHost.querySelector('[data-testid="locale-switcher"]'),
    ).not.toBeNull();

    gomokuLink.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    gomokuLink.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    goLink.click();
    await harness.fixture.whenStable();

    expect(analytics.track).toHaveBeenCalledWith({
      content_id: 'gomoku',
      content_type: 'local_mode',
      event: 'select_content',
      game_mode: 'gomoku',
    });
    expect(analytics.track).toHaveBeenCalledWith({
      content_id: 'go',
      content_type: 'local_mode',
      event: 'select_content',
      game_mode: 'go',
    });
    expect(router.url).toBe('/setup/go');
  });

  it('tracks locale changes without locale switch duplicates', async () => {
    const analytics = createAnalyticsStub();
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(
      lobbyService,
      roomService,
      'desktop',
      analytics,
    );
    TestBed.inject(GoI18nService).setLocale('zh-TW');
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    const root = harness.routeNativeElement as HTMLElement;
    const localeSelect = root.querySelector(
      '[data-testid="locale-select"]',
    ) as HTMLSelectElement;

    localeSelect.value = 'zh-TW';
    localeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    harness.fixture.detectChanges();
    localeSelect.value = 'en';
    localeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();

    expect(analytics.track).toHaveBeenCalledTimes(1);
    expect(analytics.track).toHaveBeenCalledWith({
      event: 'gx_locale_change',
      locale: 'zh-TW',
      target_locale: 'en',
    });
  });
});

function queryCreateRoomDialog(): HTMLElement | null {
  return document.body.querySelector(
    '[data-testid="lobby-create-room-dialog"]',
  ) as HTMLElement | null;
}

function queryCreateRoomDialogConfirm(): HTMLButtonElement {
  return document.body.querySelector(
    '[data-testid="lobby-create-room-dialog-confirm"]',
  ) as HTMLButtonElement;
}

function queryCreateRoomDialogCancel(): HTMLButtonElement {
  return document.body.querySelector(
    '[data-testid="lobby-create-room-dialog-cancel"]',
  ) as HTMLButtonElement;
}

function queryCreateRoomMode(mode: 'go' | 'gomoku'): HTMLInputElement {
  return document.body.querySelector(
    `[data-testid="lobby-create-mode-${mode}"]`,
  ) as HTMLInputElement;
}

function queryCreateRoomBoardSize(size: 9 | 13 | 19): HTMLInputElement {
  return document.body.querySelector(
    `[data-testid="lobby-create-board-size-${size}"]`,
  ) as HTMLInputElement;
}

function queryCreateRoomBoardSizeOrNull(
  size: 9 | 13 | 19,
): HTMLInputElement | null {
  return document.body.querySelector(
    `[data-testid="lobby-create-board-size-${size}"]`,
  ) as HTMLInputElement | null;
}

function queryCreateRoomFixedBoardSize(): HTMLElement | null {
  return document.body.querySelector(
    '[data-testid="lobby-create-board-size-fixed"]',
  );
}

function queryCreateRoomTimeControl(): HTMLSelectElement {
  return document.body.querySelector(
    '[data-testid="time-control-preset-select"]',
  ) as HTMLSelectElement;
}
