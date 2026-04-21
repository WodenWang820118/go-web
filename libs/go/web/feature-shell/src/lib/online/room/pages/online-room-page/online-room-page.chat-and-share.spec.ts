import { TestBed } from '@angular/core/testing';
import { GoI18nService } from '@gx/go/state';
import {
  createRoomServiceStub,
  createSnapshot,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

describe('OnlineRoomPageComponent > chat and share', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('renders chat message copy inside the chat panel', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        chat: [
          {
            id: 'chat-1',
            participantId: 'host-1',
            displayName: 'Host',
            message: 'Visible chat copy',
            sentAt: '2026-03-20T00:10:00.000Z',
            system: false,
          },
        ],
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const chatCopy = root.querySelector(
      '[data-testid="room-sidebar-chat-message-chat-1"]',
    ) as HTMLElement | null;
    const chatList = root.querySelector(
      '[data-testid="room-sidebar-chat-list"]',
    ) as HTMLElement | null;
    const composer = root.querySelector(
      '[data-testid="room-sidebar-chat-composer"]',
    ) as HTMLElement | null;

    expect(chatCopy).not.toBeNull();
    expect(chatList).not.toBeNull();
    expect(composer).not.toBeNull();
    expect(chatCopy?.textContent).toContain('Visible chat copy');
  });

  it('renders the empty chat state inside the chat panel', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const emptyState = root.querySelector(
      '[data-testid="room-sidebar-chat-empty"]',
    ) as HTMLElement | null;
    const i18n = TestBed.inject(GoI18nService);

    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain(i18n.t('room.chat.empty'));
  });

  it('renders a board-adjacent share chip that copies the room link with success feedback', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    expect(shareChipButton).not.toBeNull();
    expect(shareChipButton?.textContent).toContain(i18n.t('room.hero.share'));
    expect(shareChipButton?.getAttribute('aria-label')).toContain(
      i18n.t('room.hero.copy_link'),
    );
    expect(
      root.querySelector('[data-testid="room-sidebar-share-url"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-copy"]')).toBeNull();

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const feedback = root.querySelector(
      '[data-testid="room-share-chip-feedback"]',
    ) as HTMLElement | null;

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost/online/room/ROOM42',
    );
    expect(shareChipButton?.textContent).toContain(i18n.t('room.hero.copied'));
    expect(shareChipButton?.getAttribute('aria-label')).toBe(
      i18n.t('room.hero.copy_complete'),
    );
    expect(feedback?.textContent).toContain(i18n.t('room.hero.copy_complete'));
    expect(feedback?.getAttribute('role')).toBe('status');
    expect(feedback?.getAttribute('aria-live')).toBe('polite');
    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).toBeNull();
  });

  it('expands a manual-copy fallback when automatic copy is unavailable', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const manualPanel = root.querySelector(
      '[data-testid="room-share-chip-manual"]',
    ) as HTMLElement | null;
    const manualUrl = root.querySelector(
      '[data-testid="room-share-chip-manual-url"]',
    ) as HTMLInputElement | null;
    const dismissButton = root.querySelector(
      '[data-testid="room-share-chip-manual-dismiss"]',
    ) as HTMLButtonElement | null;

    expect(
      root.querySelector('[data-testid="room-share-chip-feedback"]'),
    ).toBeNull();
    expect(manualPanel?.textContent).toContain(i18n.t('room.hero.copy_failed'));
    expect(shareChipButton?.getAttribute('aria-label')).toContain(
      i18n.t('room.hero.retry_copy_link'),
    );
    expect(manualUrl?.value).toBe('http://localhost/online/room/ROOM42');
    expect(manualUrl?.readOnly).toBe(true);
    expect(manualUrl?.getAttribute('aria-label')).toBe(
      i18n.t('room.hero.manual_url_label'),
    );
    expect(manualPanel?.textContent).toContain(
      i18n.t('room.hero.copy_manual_instruction'),
    );

    dismissButton?.click();
    await harness.fixture.whenStable();

    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).toBeNull();
    expect(shareChipButton?.disabled).toBe(false);
    expect(document.activeElement).toBe(shareChipButton);
  });

  it('expands the manual-copy fallback when clipboard writes are rejected', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost/online/room/ROOM42',
    );
    expect(
      root.querySelector('[data-testid="room-share-chip-feedback"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).not.toBeNull();
  });

  it('dismisses the manual-copy fallback when Escape is pressed', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const manualPanel = root.querySelector(
      '[data-testid="room-share-chip-manual"]',
    ) as HTMLElement | null;

    manualPanel?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await harness.fixture.whenStable();

    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).toBeNull();
  });
});
