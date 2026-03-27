import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RoomSnapshot } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OnlineLobbyService } from '../online/online-lobby.service';
import { OnlineRoomService } from '../online/online-room.service';
import { goFeatureShellRoutes } from '../go-feature-shell.routes';
import { OnlineLobbyPageComponent } from '../pages/online-lobby-page.component';

describe('goFeatureShellRoutes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(goFeatureShellRoutes),
        {
          provide: OnlineLobbyService,
          useValue: {
            rooms: signal([]),
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
      ],
    });
  });

  it('renders the hosted lobby at the root route', async () => {
    const harness = await RouterTestingHarness.create();
    const i18n = TestBed.inject(GoI18nService);

    await harness.navigateByUrl('/', OnlineLobbyPageComponent);

    expect(harness.routeNativeElement?.textContent).toContain(
      i18n.t('lobby.hero.eyebrow')
    );
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
});

function createOnlineRoomServiceStub() {
  const snapshot = signal<RoomSnapshot | null>(createSnapshot());
  const participantId = signal<string | null>(null);
  const participantToken = signal<string | null>(null);
  const displayName = signal('Host');
  const bootstrapState = signal<'idle' | 'loading' | 'ready' | 'missing'>('ready');
  const connectionState = signal<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >('connected');
  const lastError = signal<string | null>(null);
  const lastNotice = signal<string | null>(null);
  const match = computed(() => snapshot()?.match ?? null);
  const participants = computed(() => snapshot()?.participants ?? []);
  const viewer = computed(
    () => participants().find(item => item.participantId === participantId()) ?? null
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
    participants,
    match,
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
      })
    ),
    claimSeat: vi.fn(),
    releaseSeat: vi.fn(),
    startMatch: vi.fn(),
    sendGameCommand: vi.fn(),
    sendChat: vi.fn(),
    muteParticipant: vi.fn(),
    unmuteParticipant: vi.fn(),
    kickParticipant: vi.fn(),
    clearTransientMessages: vi.fn(),
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
    match: null,
    chat: [],
    ...overrides,
  };
}
