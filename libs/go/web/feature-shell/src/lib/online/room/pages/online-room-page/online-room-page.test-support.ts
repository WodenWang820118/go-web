import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  type HostedMatchSnapshot,
  type ParticipantSummary,
  type RoomSnapshot,
  type SystemNotice,
} from '@gx/go/contracts';
import {
  createParticipantSummary,
  createRoomSnapshot,
  createSeatedParticipants,
} from '@gx/go/contracts/testing';
import { createBoard, createMessage } from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { provideGoPrimeNGTheme } from '@gx/go/ui';
import { Base } from 'primeng/base';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OnlineRoomService } from '../../services/online-room/online-room.service';
import { OnlineRoomsHttpService } from '../../services/online-rooms-http/online-rooms-http.service';
import { OnlineRoomPageComponent } from './online-room-page.component';

@Component({
  standalone: true,
  template: '<p>Lobby detail</p>',
})
class DummyLobbyPageComponent {}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  window.navigator,
  'clipboard',
);

type RoomBootstrapState = 'idle' | 'loading' | 'ready' | 'missing';
type RoomConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';
type RoomClosedState = {
  roomId: string;
  message: ReturnType<typeof createMessage>;
} | null;
type StubSignal<T> = ReturnType<typeof signal<T>>;
type StubMock = ReturnType<typeof vi.fn>;

export interface RoomAnalyticsStub {
  track: StubMock;
  trackOnce: StubMock;
}

export interface RoomServiceStub {
  snapshot: StubSignal<RoomSnapshot | null>;
  connectionState: StubSignal<RoomConnectionState>;
  roomClosed: StubSignal<RoomClosedState>;
  bootstrapRoom: StubMock;
  joinRoom: StubMock;
  updateNextMatchSettings: StubMock;
  respondToRematch: StubMock;
  sendGameCommand: StubMock;
  closeRoom: StubMock;
  clearRoomClosedEvent: StubMock;
}

export async function renderOnlineRoomPage(
  roomService: RoomServiceStub,
  options?: {
    analytics?: RoomAnalyticsStub;
    roomsApi?: Partial<OnlineRoomsHttpService>;
  },
) {
  TestBed.configureTestingModule({
    providers: [
      provideGoPrimeNGTheme(),
      provideRouter([
        {
          path: '',
          component: DummyLobbyPageComponent,
        },
        {
          path: 'online/room/:roomId',
          component: OnlineRoomPageComponent,
        },
      ]),
      {
        provide: OnlineRoomService,
        useValue: roomService,
      },
      {
        provide: OnlineRoomsHttpService,
        useValue: {
          getRoom: vi.fn().mockReturnValue(
            of({
              snapshot: createSnapshot(),
            }),
          ),
          ...options?.roomsApi,
        },
      },
      {
        provide: GoAnalyticsService,
        useValue: options?.analytics ?? createRoomAnalyticsStub(),
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/online/room/ROOM42', OnlineRoomPageComponent);

  return harness;
}

export function createRoomAnalyticsStub(): RoomAnalyticsStub {
  return {
    track: vi.fn(),
    trackOnce: vi.fn(),
  };
}

export function queryDialog(testId: string): HTMLElement | null {
  return document.body.querySelector(
    `[data-testid="${testId}"]`,
  ) as HTMLElement | null;
}

export function queryDialogHeaderClose(
  testId: string,
  closeAriaLabel: string,
): HTMLButtonElement | null {
  return queryDialog(testId)
    ?.closest('.p-dialog')
    ?.querySelector(
      `button[aria-label="${closeAriaLabel}"]`,
    ) as HTMLButtonElement | null;
}

export function queryVisibleDialogs(harness: RouterTestingHarness): Dialog[] {
  return harness.fixture.debugElement
    .queryAll(By.directive(Dialog))
    .map((debugElement) => debugElement.componentInstance as Dialog)
    .filter((dialog) => dialog.visible);
}

export function resetOnlineRoomPageTestEnvironment(): void {
  clearPrimeNGStyles();
  vi.restoreAllMocks();
  document.body
    .querySelectorAll('.p-dialog-mask, .p-dialog')
    .forEach((element) => element.remove());

  if (originalClipboardDescriptor) {
    Object.defineProperty(
      window.navigator,
      'clipboard',
      originalClipboardDescriptor,
    );
    return;
  }

  Reflect.deleteProperty(
    window.navigator as unknown as { clipboard?: unknown },
    'clipboard',
  );
}

export function clearPrimeNGStyles(
  base: Pick<typeof Base, 'clearLoadedStyleNames'> | undefined = Base,
): void {
  // Keep the reset on PrimeNG's public surface so the spec does not depend on
  // the internal @primeuix/styled package resolving in every CI environment.
  if (
    typeof base !== 'undefined' &&
    typeof base.clearLoadedStyleNames === 'function'
  ) {
    base.clearLoadedStyleNames();
  }

  document.head
    .querySelectorAll('style[data-primeng-style-id]')
    .forEach((styleElement) => styleElement.remove());
}

export function queryPrimeNGStyle(name: string): HTMLStyleElement | null {
  return document.head.querySelector(
    `style[data-primeng-style-id="${name}"]`,
  ) as HTMLStyleElement | null;
}

export function queryPrimeNGStyles(): HTMLStyleElement[] {
  return Array.from(
    document.head.querySelectorAll('style[data-primeng-style-id]'),
  ) as HTMLStyleElement[];
}

export function createRoomServiceStub(options: {
  snapshot: RoomSnapshot | null;
  participantId: string | null;
  participantToken: string | null;
  bootstrapState?: RoomBootstrapState;
  connectionState?: RoomConnectionState;
  lastNotice?: string | null;
  lastSystemNotice?: SystemNotice | null;
  shareUrl?: string | null;
  canInteractBoard?: boolean;
  roomClosed?: {
    roomId: string;
    message: ReturnType<typeof createMessage>;
  } | null;
}): RoomServiceStub {
  const snapshot = signal(options.snapshot);
  const participantId = signal(options.participantId);
  const participantToken = signal(options.participantToken);
  const displayName = signal('Host');
  const bootstrapState = signal<RoomBootstrapState>(
    options.bootstrapState ?? 'ready',
  );
  const connectionState = signal<RoomConnectionState>(
    options.connectionState ?? 'connected',
  );
  const lastError = signal<string | null>(null);
  const lastNotice = signal<string | null>(options.lastNotice ?? null);
  const lastSystemNotice = signal<SystemNotice | null>(
    options.lastSystemNotice ?? null,
  );
  const roomClosed = signal(options.roomClosed ?? null);
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
  const canInteractBoard = computed(() => options.canInteractBoard ?? false);
  const canChangeSeats = computed(() => true);
  const shareUrl = computed(() =>
    options.shareUrl === undefined
      ? 'http://localhost/online/room/ROOM42'
      : options.shareUrl,
  );
  const chat = computed(() => snapshot()?.chat ?? []);

  const roomService = {
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
        message: ReturnType<typeof createMessage>;
      }) => {
        roomClosed.set(event);
      },
    ),
    clearTransientMessages: vi.fn(),
    roomClosed,
    clearRoomClosedEvent: vi.fn(() => roomClosed.set(null)),
    closingRoom: signal(false),
  };

  return roomService;
}

export function createSnapshot(
  overrides: Partial<RoomSnapshot> = {},
): RoomSnapshot {
  return createRoomSnapshot({
    roomId: 'ROOM42',
    ...overrides,
  });
}

/**
 * Creates a participant fixture for room-page tests.
 */
export function createParticipant(
  overrides: Partial<ParticipantSummary> = {},
): ParticipantSummary {
  return createParticipantSummary(overrides);
}

/**
 * Creates a two-player seated room snapshot that keeps seat ownership aligned.
 */
export function createSeatedSnapshot(options?: {
  guest?: Partial<ParticipantSummary>;
  host?: Partial<ParticipantSummary>;
  overrides?: Partial<RoomSnapshot>;
}): RoomSnapshot {
  const [host, guest] = createSeatedParticipants({
    host: options?.host,
    guest: options?.guest,
  });

  return createSnapshot({
    participants: [host, guest],
    seatState: {
      black: host.participantId,
      white: guest.participantId,
    },
    ...options?.overrides,
  });
}

/**
 * Creates a hosted-match snapshot with override-friendly defaults for page specs.
 */
export function createHostedMatch(
  options: {
    boardSize?: HostedMatchSnapshot['settings']['boardSize'];
    captures?: HostedMatchSnapshot['state']['captures'];
    consecutivePasses?: number;
    lastMove?: HostedMatchSnapshot['state']['lastMove'];
    message?: HostedMatchSnapshot['state']['message'];
    mode?: HostedMatchSnapshot['settings']['mode'];
    moveHistory?: HostedMatchSnapshot['state']['moveHistory'];
    nextPlayer?: HostedMatchSnapshot['state']['nextPlayer'];
    phase?: HostedMatchSnapshot['state']['phase'];
    players?: HostedMatchSnapshot['settings']['players'];
    previousBoardHashes?: HostedMatchSnapshot['state']['previousBoardHashes'];
    result?: HostedMatchSnapshot['state']['result'];
    scoring?: HostedMatchSnapshot['state']['scoring'];
    startedAt?: string;
    winnerLine?: HostedMatchSnapshot['state']['winnerLine'];
  } = {},
): HostedMatchSnapshot {
  const mode = options.mode ?? 'go';
  const boardSize: HostedMatchSnapshot['settings']['boardSize'] =
    options.boardSize ?? (mode === 'gomoku' ? 15 : 19);
  const defaultMessage =
    options.phase === 'finished' && options.result?.summary
      ? options.result.summary
      : createMessage('game.state.next_turn', {
          player: createMessage('common.player.black'),
        });

  return {
    settings: {
      mode,
      boardSize,
      komi: mode === 'gomoku' ? 0 : 6.5,
      players: options.players ?? {
        black: 'Host',
        white: 'Guest',
      },
    },
    state: {
      mode,
      boardSize,
      board: createBoard(boardSize),
      phase: options.phase ?? 'playing',
      nextPlayer: options.nextPlayer ?? 'black',
      captures: options.captures ?? {
        black: 0,
        white: 0,
      },
      moveHistory: options.moveHistory ?? [],
      previousBoardHashes: options.previousBoardHashes ?? [],
      result: options.result ?? null,
      lastMove: options.lastMove ?? null,
      consecutivePasses: options.consecutivePasses ?? 0,
      winnerLine: options.winnerLine ?? [],
      message: options.message ?? defaultMessage,
      scoring: options.scoring ?? null,
    },
    startedAt: options.startedAt ?? '2026-03-20T00:05:00.000Z',
  };
}
