import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CreateRoomResponse, LobbyRoomSummary, RoomSnapshot } from '@gx/go/contracts';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OnlineLobbyService } from '../online/online-lobby.service';
import { OnlineRoomService } from '../online/online-room.service';
import { OnlineLobbyPageComponent } from './online-lobby-page.component';

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

    expect(lobbyService.refresh).toHaveBeenCalledTimes(1);
    expect(roomService.clearTransientMessages).toHaveBeenCalledTimes(1);
    expect(text).toContain('The hosted lobby is clear right now.');
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

    expect(text).toContain('Watch and chat live');
    expect(text).toContain(
      'Joining from the lobby takes you straight into spectator chat while the active game stays locked.'
    );
  });

  it('keeps local play links visible from the lobby-first home page', async () => {
    const lobbyService = createLobbyServiceStub([]);
    const roomService = createRoomServiceStub();

    const harness = await renderLobby(lobbyService, roomService);
    const router = TestBed.inject(Router);

    const goLink = harness.routeNativeElement?.querySelector(
      'a[href="/setup/go"]'
    ) as HTMLAnchorElement;

    expect(harness.routeNativeElement?.textContent).toContain('Start local Go');
    expect(harness.routeNativeElement?.textContent).toContain('Start local Gomoku');

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
    match: null,
    chat: [],
  };
}
