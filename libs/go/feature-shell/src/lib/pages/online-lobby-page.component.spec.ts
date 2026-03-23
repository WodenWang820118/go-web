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

describe('OnlineLobbyPageComponent', () => {
  it('shows an empty state when no public rooms are available', async () => {
    const lobbyService = createLobbyServiceStub([]);
    const roomService = createRoomServiceStub();

    const text = await renderText(lobbyService, roomService);

    expect(lobbyService.refresh).toHaveBeenCalledTimes(1);
    expect(roomService.clearTransientMessages).toHaveBeenCalledTimes(1);
    expect(text).toContain('The hosted lobby is clear right now.');
  });

  it('renders live and ready room cards with the expected lobby copy', async () => {
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
      createRoomSummary({
        roomId: 'READY7',
        hostDisplayName: 'Ready Host',
        status: 'ready',
        players: {
          black: 'Ready Host',
          white: 'Guest Ready',
        },
        participantCount: 3,
        onlineCount: 3,
        spectatorCount: 1,
      }),
    ]);
    const roomService = createRoomServiceStub();

    const text = await renderText(lobbyService, roomService);

    expect(text).toContain('Live - watch and chat');
    expect(text).toContain('Live Host\'s room');
    expect(text).toContain(
      'New visitors join as spectators and can chat until the current match ends.'
    );
    expect(text).toContain('Ready - waiting for host start');
    expect(text).toContain(
      'Both seats are filled. Open the room to follow the countdown to the host start.'
    );
  });

  it('refreshes the lobby again after ten seconds', async () => {
    vi.useFakeTimers();

    try {
      const lobbyService = createLobbyServiceStub([]);
      const roomService = createRoomServiceStub();

      await renderLobby(lobbyService, roomService);
      expect(lobbyService.refresh).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(10000);
      await Promise.resolve();

      expect(lobbyService.refresh).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('creates a room and redirects into the room detail page', async () => {
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
      'input[formcontrolname="displayName"]'
    ) as HTMLInputElement;
    const form = harness.routeNativeElement?.querySelector(
      '[data-testid="online-lobby-create-form"]'
    ) as HTMLFormElement;

    input.value = 'Captain';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();

    expect(roomService.createRoom).toHaveBeenCalledWith('Captain');
    expect(router.url).toBe('/online/room/ROOM42');
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
          path: 'online',
          component: OnlineLobbyPageComponent,
        },
        {
          path: 'online/room/:roomId',
          component: DummyRoomPageComponent,
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
  await harness.navigateByUrl('/online', OnlineLobbyPageComponent);
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
  const lastError = signal<string | null>(null);

  return {
    displayName,
    creating,
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
