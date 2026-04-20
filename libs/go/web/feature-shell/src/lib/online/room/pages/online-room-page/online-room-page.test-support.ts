import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RoomSnapshot, SystemNotice } from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
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

export type RoomServiceStub = ReturnType<typeof createRoomServiceStub>;

export async function renderOnlineRoomPage(
  roomService: RoomServiceStub,
  options?: {
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
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/online/room/ROOM42', OnlineRoomPageComponent);

  return harness;
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
  bootstrapState?: 'idle' | 'loading' | 'ready' | 'missing';
  connectionState?: 'idle' | 'connecting' | 'connected' | 'disconnected';
  lastNotice?: string | null;
  lastSystemNotice?: SystemNotice | null;
  shareUrl?: string | null;
  roomClosed?: {
    roomId: string;
    message: ReturnType<typeof createMessage>;
  } | null;
}) {
  const snapshot = signal(options.snapshot);
  const participantId = signal(options.participantId);
  const participantToken = signal(options.participantToken);
  const displayName = signal('Host');
  const bootstrapState = signal<'idle' | 'loading' | 'ready' | 'missing'>(
    options.bootstrapState ?? 'ready',
  );
  const connectionState = signal<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >(options.connectionState ?? 'connected');
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
  const shareUrl = computed(() =>
    options.shareUrl === undefined
      ? 'http://localhost/online/room/ROOM42'
      : options.shareUrl,
  );
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
      (event: { roomId: string; message: ReturnType<typeof createMessage> }) => {
        roomClosed.set(event);
      },
    ),
    clearTransientMessages: vi.fn(),
    roomClosed,
    clearRoomClosedEvent: vi.fn(() => roomClosed.set(null)),
    closingRoom: signal(false),
  };
}

export function createSnapshot(
  overrides: Partial<RoomSnapshot> = {},
): RoomSnapshot {
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
