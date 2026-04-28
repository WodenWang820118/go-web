import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RoomSnapshot, SystemNotice } from '@gx/go/contracts';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { provideGoPrimeNGTheme } from '@gx/go/ui';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OnlineLobbyService } from '../online/lobby/services/online-lobby/online-lobby.service';
import { OnlineRoomService } from '../online/room/services/online-room/online-room.service';
import { OnlineRoomsHttpService } from '../online/room/services/online-rooms-http/online-rooms-http.service';
import { goFeatureShellRoutes } from '../go-feature-shell.routes';
import { OnlineLobbyPageComponent } from '../online/lobby/online-lobby-page/online-lobby-page.component';
import { PrivacyPageComponent } from '../pages/privacy-page/privacy-page.component';

describe('goFeatureShellRoutes', () => {
  beforeEach(() => {
    localStorage.clear();
    window.dataLayer = [];
    document
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());

    TestBed.configureTestingModule({
      providers: [
        provideGoPrimeNGTheme(),
        provideRouter(goFeatureShellRoutes),
        {
          provide: OnlineLobbyService,
          useValue: {
            rooms: signal([]),
            onlineParticipants: signal([]),
            loading: signal(false),
            lastError: signal<string | null>(null),
            hasRooms: computed(() => false),
            refresh: vi.fn(),
          },
        },
        {
          provide: OnlineRoomService,
          useValue: createOnlineRoomServiceStub(),
        },
        {
          provide: OnlineRoomsHttpService,
          useValue: {
            getRoom: vi.fn().mockReturnValue(
              of({
                snapshot: createSnapshot(),
              }),
            ),
          },
        },
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
    window.dataLayer = [];
    document
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());
  });

  it('renders the hosted lobby at the root route', async () => {
    const harness = await RouterTestingHarness.create();
    const i18n = TestBed.inject(GoI18nService);

    await harness.navigateByUrl('/', OnlineLobbyPageComponent);

    expect(harness.routeNativeElement?.textContent).toContain(
      i18n.t('lobby.identity.display_name'),
    );
    expect(harness.routeNativeElement?.textContent).toContain(
      i18n.t('lobby.panel.announcement'),
    );
    expect(
      harness.routeNativeElement?.querySelector(
        '[data-testid="hosted-header-link-privacy"]',
      ),
    ).not.toBeNull();
  });

  it('renders the privacy preferences route', async () => {
    const harness = await RouterTestingHarness.create();
    const i18n = TestBed.inject(GoI18nService);

    await harness.navigateByUrl('/privacy', PrivacyPageComponent);

    const root = harness.routeNativeElement as HTMLElement;

    expect(root.textContent).toContain(i18n.t('privacy.title'));
    expect(
      root.querySelector('[data-testid="privacy-category-necessary"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="privacy-category-preferences"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="privacy-category-analytics"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="privacy-analytics-status"]')
        ?.textContent,
    ).toContain(i18n.t('privacy.analytics.status.unset'));
    expect(
      (
        root.querySelector(
          '[data-testid="privacy-analytics-allow"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      (
        root.querySelector(
          '[data-testid="privacy-analytics-deny"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it('updates analytics consent from the privacy page controls', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    TestBed.inject(GoAnalyticsService).watchRouter(router);
    const i18n = TestBed.inject(GoI18nService);

    await harness.navigateByUrl('/privacy', PrivacyPageComponent);

    const root = harness.routeNativeElement as HTMLElement;
    const allowButton = root.querySelector(
      '[data-testid="privacy-analytics-allow"]',
    ) as HTMLButtonElement;

    allowButton.click();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('granted');
    expect(
      root.querySelector('[data-testid="privacy-analytics-status"]')
        ?.textContent,
    ).toContain(i18n.t('privacy.analytics.status.granted'));
    expect(allowButton.disabled).toBe(true);
    expect(
      document.querySelector('script[id^="gx-gtm-script-"]'),
    ).not.toBeNull();
    expect(window.dataLayer).toContainEqual([
      'consent',
      'update',
      {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'granted',
      },
    ]);
    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'page_view',
        page_path_normalized: '/privacy',
        route_group: 'privacy',
      }),
    );

    const denyButton = root.querySelector(
      '[data-testid="privacy-analytics-deny"]',
    ) as HTMLButtonElement;

    expect(denyButton.disabled).toBe(false);

    denyButton.click();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('denied');
    expect(
      root.querySelector('[data-testid="privacy-analytics-status"]')
        ?.textContent,
    ).toContain(i18n.t('privacy.analytics.status.denied'));
    expect(allowButton.disabled).toBe(false);
    expect(denyButton.disabled).toBe(true);
    expect(window.dataLayer).toContainEqual([
      'consent',
      'update',
      {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'denied',
      },
    ]);
  });

  it('turns off analytics directly from an undecided privacy page state', async () => {
    const harness = await RouterTestingHarness.create();
    const i18n = TestBed.inject(GoI18nService);

    await harness.navigateByUrl('/privacy', PrivacyPageComponent);

    const root = harness.routeNativeElement as HTMLElement;
    const denyButton = root.querySelector(
      '[data-testid="privacy-analytics-deny"]',
    ) as HTMLButtonElement;

    denyButton.click();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('denied');
    expect(
      root.querySelector('[data-testid="privacy-analytics-status"]')
        ?.textContent,
    ).toContain(i18n.t('privacy.analytics.status.denied'));
    expect(denyButton.disabled).toBe(true);
    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
    expect(window.dataLayer).toContainEqual([
      'consent',
      'update',
      {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'denied',
      },
    ]);
  });

  it('renders granted analytics preference for returning privacy page visitors', async () => {
    localStorage.setItem('gx.analyticsConsent.v1', 'granted');

    const harness = await RouterTestingHarness.create();
    const i18n = TestBed.inject(GoI18nService);

    await harness.navigateByUrl('/privacy', PrivacyPageComponent);

    const root = harness.routeNativeElement as HTMLElement;
    const allowButton = root.querySelector(
      '[data-testid="privacy-analytics-allow"]',
    ) as HTMLButtonElement;
    const denyButton = root.querySelector(
      '[data-testid="privacy-analytics-deny"]',
    ) as HTMLButtonElement;

    expect(
      root.querySelector('[data-testid="privacy-analytics-status"]')
        ?.textContent,
    ).toContain(i18n.t('privacy.analytics.status.granted'));
    expect(allowButton.disabled).toBe(true);
    expect(denyButton.disabled).toBe(false);
  });

  it('renders denied analytics preference for returning privacy page visitors', async () => {
    localStorage.setItem('gx.analyticsConsent.v1', 'denied');

    const harness = await RouterTestingHarness.create();
    const i18n = TestBed.inject(GoI18nService);

    await harness.navigateByUrl('/privacy', PrivacyPageComponent);

    const root = harness.routeNativeElement as HTMLElement;
    const allowButton = root.querySelector(
      '[data-testid="privacy-analytics-allow"]',
    ) as HTMLButtonElement;
    const denyButton = root.querySelector(
      '[data-testid="privacy-analytics-deny"]',
    ) as HTMLButtonElement;

    expect(
      root.querySelector('[data-testid="privacy-analytics-status"]')
        ?.textContent,
    ).toContain(i18n.t('privacy.analytics.status.denied'));
    expect(allowButton.disabled).toBe(false);
    expect(denyButton.disabled).toBe(true);
  });

  it('redirects play routes to setup when no session exists', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/play/go');

    expect(router.url).toBe('/setup/go');
  });

  it('allows play routes after a local session is created', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    const store = TestBed.inject(GameSessionStore);

    store.startMatch({
      mode: 'go',
      boardSize: 9,
      komi: 6.5,
      players: {
        black: 'Lee',
        white: 'Cho',
      },
    });

    await harness.navigateByUrl('/play/go');

    expect(router.url).toBe('/play/go');
  });

  it('redirects the legacy /online route to the lobby home page', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/online');

    expect(router.url).toBe('/');
  });

  it('redirects the retired online create route to the lobby home page', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/online/new');

    expect(router.url).toBe('/');
  });

  it('keeps direct hosted room routes reachable', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/online/room/ROOM42');

    expect(router.url).toBe('/online/room/ROOM42');
  });

  it('blocks host route navigation away from a room until the leave confirmation is accepted', async () => {
    const roomService = TestBed.inject(OnlineRoomService) as ReturnType<
      typeof createOnlineRoomServiceStub
    >;
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    roomService.participantId.set('host-1');
    roomService.participantToken.set('token-1');

    await harness.navigateByUrl('/online/room/ROOM42');
    await harness.fixture.whenStable();

    const navigationResult = await router.navigateByUrl('/setup/go');
    await harness.fixture.whenStable();

    expect(navigationResult).toBe(false);
    expect(router.url).toBe('/online/room/ROOM42');

    const acceptButton = document.body.querySelector(
      '[data-testid="room-leave-dialog-accept"]',
    ) as HTMLButtonElement | null;

    acceptButton?.click();
    await harness.fixture.whenStable();

    expect(roomService.closeRoom).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/setup/go');
  });

  it('lets non-host viewers navigate away from a room without interception', async () => {
    const roomService = TestBed.inject(OnlineRoomService) as ReturnType<
      typeof createOnlineRoomServiceStub
    >;
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    roomService.snapshot.set(
      createSnapshot({
        participants: [
          {
            participantId: 'host-1',
            displayName: 'Host',
            seat: null,
            isHost: true,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:00:00.000Z',
          },
          {
            participantId: 'guest-1',
            displayName: 'Guest',
            seat: null,
            isHost: false,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:01:00.000Z',
          },
        ],
      }),
    );
    roomService.participantId.set('guest-1');
    roomService.participantToken.set('token-2');

    await harness.navigateByUrl('/online/room/ROOM42');
    await harness.fixture.whenStable();

    const navigationResult = await router.navigateByUrl('/setup/go');
    await harness.fixture.whenStable();

    expect(navigationResult).toBe(true);
    expect(roomService.closeRoom).not.toHaveBeenCalled();
    expect(router.url).toBe('/setup/go');
  });
});

function createOnlineRoomServiceStub() {
  const snapshot = signal<RoomSnapshot | null>(createSnapshot());
  const participantId = signal<string | null>(null);
  const participantToken = signal<string | null>(null);
  const displayName = signal('Host');
  const bootstrapState = signal<'idle' | 'loading' | 'ready' | 'missing'>(
    'ready',
  );
  const connectionState = signal<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >('connected');
  const lastError = signal<string | null>(null);
  const lastNotice = signal<string | null>(null);
  const lastSystemNotice = signal<SystemNotice | null>(null);
  const roomClosed = signal<{
    roomId: string;
    message: {
      key: string;
      params?: Record<string, string | number | boolean | null | undefined>;
    };
  } | null>(null);
  const match = computed(() => snapshot()?.match ?? null);
  const participants = computed(() => snapshot()?.participants ?? []);
  const nextMatchSettings = computed(
    () => snapshot()?.nextMatchSettings ?? null,
  );
  const rematch = computed(() => snapshot()?.rematch ?? null);
  const nigiri = computed(() => snapshot()?.nigiri ?? null);
  const autoStartBlockedUntilSeatChange = computed(
    () => snapshot()?.autoStartBlockedUntilSeatChange ?? false,
  );
  const viewer = computed(
    () =>
      participants().find((item) => item.participantId === participantId()) ??
      null,
  );
  const viewerSeat = computed(() => viewer()?.seat ?? null);
  const isHost = computed(() => viewer()?.isHost ?? false);
  const isMuted = computed(() => viewer()?.muted ?? false);
  const isActivePlayer = computed(() => false);
  const canInteractBoard = computed(() => false);
  const canChangeSeats = computed(() => true);
  const shareUrl = computed(() => 'http://localhost/online/room/ROOM42');
  const chat = computed(() => snapshot()?.chat ?? []);

  return {
    snapshot,
    participantId,
    participantToken,
    displayName,
    bootstrapState,
    connectionState,
    joining: signal(false),
    creating: signal(false),
    lastError,
    lastNotice,
    lastSystemNotice,
    participants,
    match,
    nextMatchSettings,
    rematch,
    nigiri,
    autoStartBlockedUntilSeatChange,
    viewer,
    viewerSeat,
    isHost,
    isMuted,
    isActivePlayer,
    canInteractBoard,
    canChangeSeats,
    shareUrl,
    chat,
    bootstrapRoom: vi.fn(),
    joinRoom: vi.fn().mockReturnValue(of(void 0)),
    createRoom: vi.fn().mockReturnValue(
      of({
        roomId: 'ROOM42',
        participantId: 'host-1',
        participantToken: 'token-1',
        snapshot: createSnapshot(),
      }),
    ),
    claimSeat: vi.fn(),
    releaseSeat: vi.fn(),
    updateNextMatchSettings: vi.fn(),
    respondToRematch: vi.fn(),
    sendGameCommand: vi.fn(),
    sendChat: vi.fn(),
    muteParticipant: vi.fn(),
    unmuteParticipant: vi.fn(),
    kickParticipant: vi.fn(),
    closeRoom: vi.fn().mockReturnValue(of(void 0)),
    closeRoomWithKeepalive: vi.fn().mockResolvedValue(undefined),
    markRoomClosed: vi.fn(
      (event: {
        roomId: string;
        message: {
          key: string;
          params?: Record<string, string | number | boolean | null | undefined>;
        };
      }) => {
        roomClosed.set(event);
      },
    ),
    clearTransientMessages: vi.fn(),
    roomClosed,
    clearRoomClosedEvent: vi.fn(() => roomClosed.set(null)),
    closingRoom: signal(false),
  };
}

function createSnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  return {
    roomId: 'ROOM42',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    hostParticipantId: 'host-1',
    participants: [
      {
        participantId: 'host-1',
        displayName: 'Host',
        seat: null,
        isHost: true,
        online: true,
        muted: false,
        joinedAt: '2026-03-20T00:00:00.000Z',
      },
    ],
    seatState: {
      black: null,
      white: null,
    },
    nextMatchSettings: {
      mode: 'go',
      boardSize: 19,
      komi: 6.5,
    },
    rematch: null,
    autoStartBlockedUntilSeatChange: false,
    match: null,
    chat: [],
    ...overrides,
  };
}
