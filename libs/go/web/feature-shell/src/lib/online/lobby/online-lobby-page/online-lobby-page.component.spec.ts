import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CreateRoomResponse, LobbyRoomSummary, RoomSnapshot } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state';
import { of } from 'rxjs';
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

describe('OnlineLobbyPageComponent', () => {
  it('shows an empty state when no public rooms are available', async () => {
    const lobbyService = createLobbyServiceStub([]);
    const roomService = createRoomServiceStub();

    const text = await renderText(lobbyService, roomService);
    const i18n = TestBed.inject(GoI18nService);

    expect(lobbyService.refresh).toHaveBeenCalledTimes(1);
    expect(roomService.clearTransientMessages).toHaveBeenCalledTimes(1);
    expect(text).toContain(i18n.t('lobby.empty.title'));
  });

  it('creates a room from the root lobby and redirects into the room detail page', async () => {
    const lobbyService = createLobbyServiceStub([]);
    const roomService = createRoomServiceStub({
      createRoomResponse: {
        roomId: 'ROOM42',
        participantId: 'host-1',
        participantToken: 'token-1',
        snapshot: createSnapshot('ROOM42'),
      },
    });

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const input = harness.routeNativeElement?.querySelector(
      '[data-testid="lobby-display-name-input"]'
    ) as HTMLInputElement;
    const button = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-button"]'
    ) as HTMLButtonElement;

    input.value = 'Captain';
    input.dispatchEvent(new Event('input'));
    button.click();
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith('Captain');
    expect(router.url).toBe('/online/room/ROOM42');
  });

  it('selects a room and quick-joins it from the lobby', async () => {
    const lobbyService = createLobbyServiceStub([
      createRoomSummary({
        roomId: 'WAIT42',
        hostDisplayName: 'Waiting Host',
      }),
      createRoomSummary({
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
    ]);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const input = harness.routeNativeElement?.querySelector(
      '[data-testid="lobby-display-name-input"]'
    ) as HTMLInputElement;
    const roomCard = harness.routeNativeElement?.querySelector(
      '[data-testid="lobby-room-READY7"]'
    ) as HTMLButtonElement;
    const joinButton = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-join-selected-button"]'
    ) as HTMLButtonElement;

    input.value = 'Captain';
    input.dispatchEvent(new Event('input'));
    roomCard.click();
    await harness.fixture.whenStable();
    joinButton.click();
    await harness.fixture.whenStable();

    expect(roomService.joinRoom).toHaveBeenCalledWith('READY7', 'Captain');
    expect(router.url).toBe('/online/room/READY7');
  });

  it('uses live-room spectator copy in the selected-room action panel', async () => {
    const lobbyService = createLobbyServiceStub([
      createRoomSummary({
        roomId: 'LIVE42',
        hostDisplayName: 'Live Host',
        status: 'live',
        mode: 'gomoku',
        boardSize: 15,
        players: {
          black: 'Live Host',
          white: 'Guest Live',
        },
        participantCount: 2,
        onlineCount: 2,
        spectatorCount: 0,
      }),
    ]);
    const roomService = createRoomServiceStub();

    const text = await renderText(lobbyService, roomService);
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('lobby.room.action.live'));
    expect(text).toContain(
      i18n.t('lobby.room.status.live.copy')
    );
  });

  it('switches lobby status tabs without losing quick-select behavior', async () => {
    const lobbyService = createLobbyServiceStub([
      createRoomSummary({
        roomId: 'LIVE42',
        status: 'live',
        hostDisplayName: 'Live Host',
      }),
      createRoomSummary({
        roomId: 'READY7',
        status: 'ready',
        hostDisplayName: 'Ready Host',
        players: {
          black: 'Ready Host',
          white: 'Guest Ready',
        },
        participantCount: 2,
        onlineCount: 2,
      }),
    ]);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const readyTab = root.querySelector('[data-testid="lobby-tab-ready"]') as HTMLButtonElement;

    readyTab.click();
    await harness.fixture.whenStable();

    expect(root.querySelector('[data-testid="lobby-room-READY7"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="lobby-room-LIVE42"]')).toBeNull();
    expect(root.textContent).toContain('Ready Host');
  });

  it('keeps local play links visible from the lobby-first home page', async () => {
    const lobbyService = createLobbyServiceStub([]);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);
    const i18n = TestBed.inject(GoI18nService);

    const goLink = harness.routeNativeElement?.querySelector(
      'a[href="/setup/go"]'
    ) as HTMLAnchorElement;

    expect(harness.routeNativeElement?.textContent).toContain(
      i18n.t('hosted.header.start_local_go')
    );
    expect(harness.routeNativeElement?.textContent).toContain(
      i18n.t('hosted.header.start_local_gomoku')
    );

    goLink.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/setup/go');
  });
});

async function renderText(
  lobbyService: ReturnType<typeof createLobbyServiceStub>,
  roomService: ReturnType<typeof createRoomServiceStub>
) {
  const harness = await renderLobby(lobbyService, roomService);
  return harness.routeNativeElement?.textContent as string;
}

async function renderLobby(
  lobbyService: ReturnType<typeof createLobbyServiceStub>,
  roomService: ReturnType<typeof createRoomServiceStub>
) {
  TestBed.configureTestingModule({
    providers: [
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

function createLobbyServiceStub(rooms: LobbyRoomSummary[]) {
  const roomsSignal = signal(rooms);
  const loading = signal(false);
  const lastError = signal<string | null>(null);

  return {
    rooms: roomsSignal,
    loading,
    lastError,
    hasRooms: computed(() => roomsSignal().length > 0),
    refresh: vi.fn(),
  };
}

function createRoomServiceStub(options?: {
  createRoomResponse?: Omit<CreateRoomResponse, 'snapshot'> & { snapshot: RoomSnapshot };
}) {
  const displayName = signal('Host');
  const creating = signal(false);
  const joining = signal(false);
  const lastError = signal<string | null>(null);

  return {
    displayName,
    creating,
    joining,
    lastError,
    clearTransientMessages: vi.fn(),
    createRoom: vi.fn().mockReturnValue(
      of(
        options?.createRoomResponse ?? {
          roomId: 'ROOM01',
          participantId: 'host-1',
          participantToken: 'token-1',
          snapshot: createSnapshot('ROOM01'),
        }
      )
    ),
    joinRoom: vi.fn().mockReturnValue(of(void 0)),
  };
}

function createRoomSummary(
  overrides: Partial<LobbyRoomSummary> = {}
): LobbyRoomSummary {
  return {
    roomId: 'ROOM01',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    hostDisplayName: 'Host',
    status: 'waiting',
    mode: null,
    boardSize: null,
    players: {
      black: null,
      white: null,
    },
    participantCount: 1,
    onlineCount: 1,
    spectatorCount: 1,
    ...overrides,
  };
}

function createSnapshot(roomId: string): RoomSnapshot {
  return {
    roomId,
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
  };
}
