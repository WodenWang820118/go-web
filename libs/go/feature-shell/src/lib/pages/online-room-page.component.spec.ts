import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { computed, signal } from '@angular/core';
import { RoomSnapshot } from '@org/go/contracts';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OnlineRoomPageComponent } from './online-room-page.component';
import { OnlineRoomService } from '../online/online-room.service';

describe('OnlineRoomPageComponent', () => {
  it('shows the join form for visitors who have not joined the room', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const text = await renderText(roomService);

    expect(roomService.bootstrapRoom).toHaveBeenCalledWith('ROOM42');
    expect(text).toContain('Join room');
    expect(text).not.toContain('Host controls');
  });

  it('shows host controls when the current viewer is the host', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const text = await renderText(roomService);

    expect(text).toContain('Host controls');
    expect(text).toContain('You are here as');
  });

  it('shows waiting copy when seats are still open', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const text = await renderText(roomService);

    expect(text).toContain('Waiting room');
    expect(text).toContain('Open seats are still available.');
  });

  it('shows ready copy when both seats are filled before the match starts', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        participants: [
          {
            participantId: 'host-1',
            displayName: 'Host',
            seat: 'black',
            isHost: true,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:00:00.000Z',
          },
          {
            participantId: 'guest-1',
            displayName: 'Guest',
            seat: 'white',
            isHost: false,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:01:00.000Z',
          },
        ],
        seatState: {
          black: 'host-1',
          white: 'guest-1',
        },
      }),
      participantId: null,
      participantToken: null,
    });

    const text = await renderText(roomService);

    expect(text).toContain('Ready room');
    expect(text).toContain('Players are matched and waiting for the host.');
  });

  it('shows spectator join copy for live rooms', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        participants: [
          {
            participantId: 'host-1',
            displayName: 'Host',
            seat: 'black',
            isHost: true,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:00:00.000Z',
          },
          {
            participantId: 'guest-1',
            displayName: 'Guest',
            seat: 'white',
            isHost: false,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:01:00.000Z',
          },
        ],
        seatState: {
          black: 'host-1',
          white: 'guest-1',
        },
        match: {
          settings: {
            mode: 'gomoku',
            boardSize: 15,
            komi: 0,
            players: {
              black: 'Host',
              white: 'Guest',
            },
          },
          state: {
            mode: 'gomoku',
            boardSize: 15,
            board: Array.from({ length: 15 }, () =>
              Array.from({ length: 15 }, () => null)
            ),
            phase: 'playing',
            nextPlayer: 'black',
            captures: {
              black: 0,
              white: 0,
            },
            moveHistory: [],
            previousBoardHashes: [],
            result: null,
            lastMove: null,
            consecutivePasses: 0,
            winnerLine: [],
            message: 'Black to move.',
            scoring: null,
          },
          startedAt: '2026-03-20T00:05:00.000Z',
        },
      }),
      participantId: null,
      participantToken: null,
    });

    const text = await renderText(roomService);

    expect(text).toContain('Join as spectator');
    expect(text).toContain('Live rooms are watch-and-chat only until the current match ends.');
  });
});

async function renderText(roomService: ReturnType<typeof createRoomServiceStub>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: 'online/room/:roomId',
          component: OnlineRoomPageComponent,
        },
      ]),
      {
        provide: OnlineRoomService,
        useValue: roomService,
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(
    '/online/room/ROOM42',
    OnlineRoomPageComponent
  );

  return harness.routeNativeElement?.textContent as string;
}

function createRoomServiceStub(options: {
  snapshot: RoomSnapshot | null;
  participantId: string | null;
  participantToken: string | null;
}) {
  const snapshot = signal(options.snapshot);
  const participantId = signal(options.participantId);
  const participantToken = signal(options.participantToken);
  const displayName = signal('Host');
  const bootstrapState = signal<'idle' | 'loading' | 'ready' | 'missing'>('ready');
  const connectionState = signal<'idle' | 'connecting' | 'connected' | 'disconnected'>(
    'connected'
  );
  const lastError = signal<string | null>(null);
  const lastNotice = signal<string | null>(null);
  const match = computed(() => snapshot()?.match ?? null);
  const participants = computed(() => snapshot()?.participants ?? []);
  const viewer = computed(() =>
    participants().find(item => item.participantId === participantId()) ?? null
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
