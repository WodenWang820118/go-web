import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { computed, signal } from '@angular/core';
import { RoomSnapshot } from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
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
    const i18n = TestBed.inject(GoI18nService);

    expect(roomService.bootstrapRoom).toHaveBeenCalledWith('ROOM42');
    expect(text).toContain(i18n.t('room.participants.join_room'));
    expect(text).not.toContain(i18n.t('room.participants.host_controls'));
  });

  it('shows host controls when the current viewer is the host', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const text = await renderText(roomService);
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.participants.host_controls'));
    expect(text).toContain(i18n.t('room.participants.you_are_here_as'));
  });

  it('shows waiting copy when seats are still open', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const text = await renderText(roomService);
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.waiting.label'));
    expect(text).toContain(i18n.t('room.stage.waiting.title'));
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
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.ready.label'));
    expect(text).toContain(i18n.t('room.stage.ready.title'));
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
            message: createMessage('game.state.next_turn', {
              player: createMessage('common.player.black'),
            }),
            scoring: null,
          },
          startedAt: '2026-03-20T00:05:00.000Z',
        },
      }),
      participantId: null,
      participantToken: null,
    });

    const text = await renderText(roomService);
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.join.title.spectator'));
    expect(text).toContain(i18n.t('room.join.description.spectator'));
  });

  it('warns joined viewers when realtime is disconnected and disables seat claims', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
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
      participantId: 'guest-1',
      participantToken: 'token-guest',
      connectionState: 'disconnected',
    });

    const harness = await renderPage(roomService);
    const i18n = TestBed.inject(GoI18nService);
    const root = harness.routeNativeElement as HTMLElement;
    const claimBlackButton = root.querySelector(
      '[data-testid="claim-black"]'
    ) as HTMLButtonElement | null;

    expect(root.textContent).toContain(
      i18n.t('room.client.realtime_unavailable')
    );
    expect(claimBlackButton).not.toBeNull();
    expect(claimBlackButton?.disabled).toBe(true);
  });

  it('suffixes duplicate join names before submitting the room form', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
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
      }),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const form = root.querySelector('[data-testid="join-room-form"]') as HTMLFormElement;
    const input = root.querySelector('#room-join-display-name') as HTMLInputElement;

    input.value = 'Host';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();

    expect(roomService.joinRoom).toHaveBeenCalledWith('ROOM42', 'Host (2)');
    expect(input.value).toBe('Host (2)');
  });
});

async function renderPage(roomService: ReturnType<typeof createRoomServiceStub>) {
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

  return harness;
}

async function renderText(roomService: ReturnType<typeof createRoomServiceStub>) {
  const harness = await renderPage(roomService);
  return harness.routeNativeElement?.textContent as string;
}

function createRoomServiceStub(options: {
  snapshot: RoomSnapshot | null;
  participantId: string | null;
  participantToken: string | null;
  connectionState?: 'idle' | 'connecting' | 'connected' | 'disconnected';
}) {
  const snapshot = signal(options.snapshot);
  const participantId = signal(options.participantId);
  const participantToken = signal(options.participantToken);
  const displayName = signal('Host');
  const bootstrapState = signal<'idle' | 'loading' | 'ready' | 'missing'>('ready');
  const connectionState = signal<'idle' | 'connecting' | 'connected' | 'disconnected'>(
    options.connectionState ?? 'connected'
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
