import { TestBed } from '@angular/core/testing';
import { GoI18nService } from '@gx/go/state';
import { createMessage } from '@gx/go/domain';
import {
  createRoomServiceStub,
  createSnapshot,
  queryDialog,
  queryDialogHeaderClose,
  queryVisibleDialogs,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

describe('OnlineRoomPageComponent > rematch and results', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('opens the rematch prompt in a dialog after a finished match', async () => {
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
        rematch: {
          participants: {
            black: 'host-1',
            white: 'guest-1',
          },
          responses: {
            black: 'pending',
            white: 'accepted',
          },
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
            phase: 'finished',
            nextPlayer: 'black',
            captures: {
              black: 0,
              white: 0,
            },
            moveHistory: [],
            previousBoardHashes: [],
            result: {
              summary: createMessage('game.gomoku.result.five_in_row', {
                winner: createMessage('common.player.black'),
              }),
              winner: 'black',
              score: null,
            },
            lastMove: null,
            consecutivePasses: 0,
            winnerLine: [],
            message: createMessage('game.gomoku.result.five_in_row', {
              winner: createMessage('common.player.black'),
            }),
            scoring: null,
          },
          startedAt: '2026-03-20T00:05:00.000Z',
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const rematchDialog = queryDialog('room-rematch-dialog');
    const closeButton = queryDialogHeaderClose(
      'room-rematch-dialog',
      i18n.t('common.action.close'),
    );
    const [visibleDialog] = queryVisibleDialogs(harness);

    expect(
      root.querySelector('[data-testid="room-sidebar-rematch"]'),
    ).toBeNull();
    expect(rematchDialog).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-rematch-dialog"]'),
    ).toBeNull();
    expect(document.body.textContent).toContain(i18n.t('room.rematch.title'));
    expect(document.body.textContent).toContain(i18n.t('room.rematch.accept'));
    expect(closeButton).toBeNull();
    expect(visibleDialog?.closable).toBe(false);
    expect(visibleDialog?.dismissableMask).toBe(false);
    expect(roomService.respondToRematch).not.toHaveBeenCalled();

    const acceptButton = document.body.querySelector(
      '[data-testid="room-rematch-dialog-accept"]',
    ) as HTMLButtonElement | null;

    acceptButton?.click();
    await harness.fixture.whenStable();

    expect(roomService.respondToRematch).toHaveBeenCalledWith(true);
  });

  it('makes the spectator rematch dialog closable and dismissable', async () => {
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
        rematch: {
          participants: {
            black: 'host-1',
            white: 'guest-1',
          },
          responses: {
            black: 'pending',
            white: 'accepted',
          },
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
            phase: 'finished',
            nextPlayer: 'black',
            captures: {
              black: 0,
              white: 0,
            },
            moveHistory: [],
            previousBoardHashes: [],
            result: {
              summary: createMessage('game.gomoku.result.five_in_row', {
                winner: createMessage('common.player.black'),
              }),
              winner: 'black',
              score: null,
            },
            lastMove: null,
            consecutivePasses: 0,
            winnerLine: [],
            message: createMessage('game.gomoku.result.five_in_row', {
              winner: createMessage('common.player.black'),
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
    const i18n = TestBed.inject(GoI18nService);
    const closeButton = queryDialogHeaderClose(
      'room-rematch-dialog',
      i18n.t('common.action.close'),
    );
    const [visibleDialog] = queryVisibleDialogs(harness);

    expect(queryDialog('room-rematch-dialog')).not.toBeNull();
    expect(closeButton).not.toBeNull();
    expect(visibleDialog?.closable).toBe(true);
    expect(visibleDialog?.dismissableMask).toBe(true);
    expect(roomService.respondToRematch).not.toHaveBeenCalled();
  });

  it('lets spectators dismiss the rematch dialog with the header close button', async () => {
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
        rematch: {
          participants: {
            black: 'host-1',
            white: 'guest-1',
          },
          responses: {
            black: 'pending',
            white: 'accepted',
          },
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
            phase: 'finished',
            nextPlayer: 'black',
            captures: {
              black: 0,
              white: 0,
            },
            moveHistory: [],
            previousBoardHashes: [],
            result: {
              summary: createMessage('game.gomoku.result.five_in_row', {
                winner: createMessage('common.player.black'),
              }),
              winner: 'black',
              score: null,
            },
            lastMove: null,
            consecutivePasses: 0,
            winnerLine: [],
            message: createMessage('game.gomoku.result.five_in_row', {
              winner: createMessage('common.player.black'),
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
    const i18n = TestBed.inject(GoI18nService);
    const closeButton = queryDialogHeaderClose(
      'room-rematch-dialog',
      i18n.t('common.action.close'),
    );

    expect(queryDialog('room-rematch-dialog')).not.toBeNull();
    expect(closeButton).not.toBeNull();

    closeButton?.click();
    await harness.fixture.whenStable();

    expect(queryDialog('room-rematch-dialog')).toBeNull();
    expect(roomService.respondToRematch).not.toHaveBeenCalled();
  });

  it('shows resignation results in a dialog and removes the inline stage hud', async () => {
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
        rematch: {
          participants: {
            black: 'host-1',
            white: 'guest-1',
          },
          responses: {
            black: 'pending',
            white: 'pending',
          },
        },
        match: {
          settings: {
            mode: 'go',
            boardSize: 19,
            komi: 6.5,
            players: {
              black: 'Host',
              white: 'Guest',
            },
          },
          state: {
            mode: 'go',
            boardSize: 19,
            board: Array.from({ length: 19 }, () =>
              Array.from({ length: 19 }, () => null),
            ),
            phase: 'finished',
            nextPlayer: 'black',
            captures: {
              black: 0,
              white: 0,
            },
            moveHistory: [],
            previousBoardHashes: [],
            result: {
              summary: createMessage('game.result.win_by_resignation', {
                winner: createMessage('common.player.black'),
              }),
              winner: 'black',
              resignedBy: 'white',
              reason: 'resign',
              score: null,
            },
            lastMove: null,
            consecutivePasses: 0,
            winnerLine: [],
            message: createMessage('game.result.win_by_resignation', {
              winner: createMessage('common.player.black'),
            }),
            scoring: null,
          },
          startedAt: '2026-03-20T00:05:00.000Z',
        },
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const dialog = document.body.querySelector(
      '[data-testid="room-resign-result-dialog"]',
    ) as HTMLElement | null;
    const closeButton = queryDialogHeaderClose(
      'room-resign-result-dialog',
      i18n.t('common.action.close'),
    );

    expect(dialog).not.toBeNull();
    expect(document.body.textContent).toContain(
      i18n.t('room.dialog.match_result.title'),
    );
    expect(dialog?.textContent).toContain(
      i18n.t('game.result.win_by_resignation', {
        winner: i18n.t('common.player.black'),
      }),
    );
    expect(root.querySelector('[data-testid="room-stage-hud"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-rematch"]'),
    ).toBeNull();

    closeButton?.click();
    await harness.fixture.whenStable();

    expect(queryDialog('room-resign-result-dialog')).toBeNull();
    expect(
      document.body.querySelector('[data-testid="room-rematch-dialog"]'),
    ).not.toBeNull();
  });
});
