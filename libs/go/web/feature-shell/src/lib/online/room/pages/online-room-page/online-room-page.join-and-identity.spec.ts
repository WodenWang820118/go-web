import { TestBed } from '@angular/core/testing';
import { GoI18nService } from '@gx/go/state';
import { createMessage } from '@gx/go/domain';
import {
  createRoomServiceStub,
  createSnapshot,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

describe('OnlineRoomPageComponent > join and identity', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('shows the join form for visitors who have not joined the room', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
    const i18n = TestBed.inject(GoI18nService);

    expect(roomService.bootstrapRoom).toHaveBeenCalledWith('ROOM42');
    expect(text).toContain(i18n.t('room.participants.join_room'));
    expect(text).not.toContain(i18n.t('room.next_match.save'));
  });

  it('does not render a joined-viewer identity card in the sidebar when the viewer is the host', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-identity"]'),
    ).toBeNull();
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
              Array.from({ length: 15 }, () => null),
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

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
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
        nextMatchSettings: {
          mode: 'gomoku',
          boardSize: 15,
        },
      }),
      participantId: 'guest-1',
      participantToken: 'token-guest',
      connectionState: 'disconnected',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const claimBlackButton = root.querySelector(
      '[data-testid="claim-black"]',
    ) as HTMLButtonElement | null;

    expect(
      root.querySelector('[data-testid="room-sidebar-message-warning"]'),
    ).toBeNull();
    expect(claimBlackButton).not.toBeNull();
    expect(claimBlackButton?.disabled).toBe(true);
  });

  it('shows the join form inside the new sidebar for visitors who have not joined', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat"]'),
    ).not.toBeNull();
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

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const form = root.querySelector(
      '[data-testid="join-room-form"]',
    ) as HTMLFormElement;
    const input = root.querySelector(
      '#room-join-display-name',
    ) as HTMLInputElement;

    input.value = 'Host';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await harness.fixture.whenStable();

    expect(roomService.joinRoom).toHaveBeenCalledWith('ROOM42', 'Host (2)');
    expect(input.value).toBe('Host (2)');
  });
});
