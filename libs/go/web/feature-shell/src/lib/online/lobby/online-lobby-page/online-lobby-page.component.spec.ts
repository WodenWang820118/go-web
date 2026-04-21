import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GoI18nService } from '@gx/go/state';
import { throwError } from 'rxjs';
import { vi } from 'vitest';

import { OnlineLobbyFlashNoticeService } from '../services/online-lobby-flash-notice/online-lobby-flash-notice.service';
import {
  createLobbyRoom,
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

  it('creates a room from the lobby and redirects into the room detail page', async () => {
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
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith('Captain');
    expect(router.url).toBe('/online/room/ROOM42');
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

    expect(roomService.joinRoom).toHaveBeenCalledWith('READY7', 'Captain');
    expect(router.url).toBe('/online/room/READY7');
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

    expect(roomService.joinRoom).toHaveBeenCalledWith('WAIT42', 'Captain');
    expect(router.url).toBe('/online/room/WAIT42');
  });

  it('does not navigate when room creation fails', async () => {
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub({
      createRoomResult: throwError(() => new Error('create failed')),
    });

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]',
    ) as HTMLButtonElement;

    await fillLobbyDisplayName(harness);
    button.click();
    await harness.fixture.whenStable();

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
    const lobbyService = createLobbyServiceStub([], []);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
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

    expect(
      root.querySelector('[data-testid="locale-switcher"]'),
    ).not.toBeNull();
    expect(root.textContent).not.toContain(i18n.t('hosted.header.lobby'));
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

    goLink.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/setup/go');
  });
});
