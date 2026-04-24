import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  CreateRoomResponse,
  LobbyOnlineParticipantSummary,
  LobbyRoomSummary,
  RoomSnapshot,
} from '@gx/go/contracts';
import {
  createLobbyOnlineParticipant,
  createLobbyRoomSummary,
  createRoomSnapshot,
} from '@gx/go/contracts/testing';
import { provideGoPrimeNGTheme } from '@gx/go/ui';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { OnlineLobbyPageComponent } from './online-lobby-page.component';
import { OnlineLobbyService } from '../services/online-lobby/online-lobby.service';
import { OnlineRoomService } from '../../room/services/online-room/online-room.service';

@Component({
  standalone: true,
  template: '<p>Room detail</p>',
})
class DummyRoomPageComponent {}

@Component({
  standalone: true,
  template: '<p>Setup detail</p>',
})
class DummySetupPageComponent {}

type StubSignal<T> = ReturnType<typeof signal<T>>;
type StubMock = ReturnType<typeof vi.fn>;

export interface LobbyServiceStub {
  rooms: StubSignal<LobbyRoomSummary[]>;
  onlineParticipants: StubSignal<LobbyOnlineParticipantSummary[]>;
  loading: StubSignal<boolean>;
  lastError: StubSignal<string | null>;
  hasRooms: ReturnType<typeof computed<boolean>>;
  refresh: StubMock;
}

export interface RoomServiceStub {
  displayName: StubSignal<string>;
  creating: StubSignal<boolean>;
  joining: StubSignal<boolean>;
  lastError: StubSignal<string | null>;
  clearTransientMessages: StubMock;
  createRoom: StubMock;
  joinRoom: StubMock;
}

/**
 * Renders the lobby route with reusable service stubs and viewport-aware media queries.
 */
export async function renderLobby(
  lobbyService: LobbyServiceStub,
  roomService: RoomServiceStub,
  viewport: 'desktop' | 'mobile' = 'desktop',
) {
  stubMatchMedia(viewport === 'desktop');
  TestBed.configureTestingModule({
    providers: [
      provideGoPrimeNGTheme(),
      provideRouter([
        {
          path: '',
          component: OnlineLobbyPageComponent,
        },
        {
          path: 'online/room/:roomId',
          component: DummyRoomPageComponent,
        },
        {
          path: 'setup/:mode',
          component: DummySetupPageComponent,
        },
      ]),
      {
        provide: OnlineLobbyService,
        useValue: lobbyService,
      },
      {
        provide: OnlineRoomService,
        useValue: roomService,
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/', OnlineLobbyPageComponent);
  await harness.fixture.whenStable();

  return harness;
}

/**
 * Fills the hosted-room lobby display-name input and flushes Angular change detection.
 */
export async function fillLobbyDisplayName(
  harness: RouterTestingHarness,
  value = 'Captain',
): Promise<void> {
  const input = harness.routeNativeElement?.querySelector(
    '[data-testid="lobby-display-name-input"]',
  ) as HTMLInputElement;

  input.value = value;
  input.dispatchEvent(new Event('input'));
  harness.fixture.detectChanges();
  await harness.fixture.whenStable();
}

/**
 * Creates the lobby service stub used by page tests.
 */
export function createLobbyServiceStub(
  rooms: LobbyRoomSummary[] = [],
  onlineParticipants: LobbyOnlineParticipantSummary[] = [],
  options?: {
    lastError?: string | null;
  },
): LobbyServiceStub {
  const roomsSignal = signal(rooms);
  const onlineParticipantsSignal = signal(onlineParticipants);
  const loading = signal(false);
  const lastError = signal<string | null>(options?.lastError ?? null);

  return {
    rooms: roomsSignal,
    onlineParticipants: onlineParticipantsSignal,
    loading,
    lastError,
    hasRooms: computed(() => roomsSignal().length > 0),
    refresh: vi.fn(),
  };
}

/**
 * Creates the room service stub used by lobby navigation tests.
 */
export function createRoomServiceStub(options?: {
  createRoomResponse?: Omit<CreateRoomResponse, 'snapshot'> & {
    snapshot: RoomSnapshot;
  };
  createRoomResult?: Observable<CreateRoomResponse>;
  joinRoomResult?: Observable<void>;
  lastError?: string | null;
}): RoomServiceStub {
  const displayName = signal('');
  const creating = signal(false);
  const joining = signal(false);
  const lastError = signal<string | null>(options?.lastError ?? null);

  return {
    displayName,
    creating,
    joining,
    lastError,
    clearTransientMessages: vi.fn(),
    createRoom: vi.fn().mockReturnValue(
      options?.createRoomResult ??
        of(
          options?.createRoomResponse ?? {
            roomId: 'ROOM01',
            participantId: 'host-1',
            participantToken: 'token-1',
            snapshot: createRoomSnapshot(),
          },
        ),
    ),
    joinRoom: vi.fn().mockReturnValue(options?.joinRoomResult ?? of(void 0)),
  };
}

export function createLobbyRoom(overrides: Partial<LobbyRoomSummary> = {}) {
  return createLobbyRoomSummary(overrides);
}

export function createOnlineParticipant(
  overrides: Partial<LobbyOnlineParticipantSummary> = {},
) {
  return createLobbyOnlineParticipant(overrides);
}

export function createLobbySnapshot(roomId: string): RoomSnapshot {
  return createRoomSnapshot({ roomId });
}

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches,
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}
