import { TestBed } from '@angular/core/testing';
import { GoI18nService } from '@gx/go/state';
import { createMessage } from '@gx/go/domain';
import {
  createRoomServiceStub,
  createSnapshot,
  queryDialog,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

describe('OnlineRoomPageComponent > stage and layout', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('shows waiting copy when seats are still open', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
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

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.ready.label'));
    expect(text).toContain(i18n.t('room.stage.ready.title'));
  });

  it('shows blocked copy when auto-start is paused after a declined rematch', async () => {
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
        autoStartBlockedUntilSeatChange: true,
      }),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const text = harness.routeNativeElement?.textContent as string;
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.blocked.label'));
    expect(text).toContain(i18n.t('room.stage.blocked.title'));
  });

  it('renders the simplified sidebar with chat-integrated room info', async () => {
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
            moveHistory: [
              {
                id: 'move-1',
                moveNumber: 1,
                player: 'black',
                command: {
                  type: 'place',
                  point: { x: 7, y: 7 },
                },
                notation: 'H8',
                boardHashAfterMove: 'hash-1',
                phaseAfterMove: 'playing',
                capturedPoints: [],
                capturesAfterMove: {
                  black: 0,
                  white: 0,
                },
              },
            ],
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
      participantId: 'guest-1',
      participantToken: 'token-guest',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const stageHost = root.querySelector('lib-go-online-room-stage-section');
    const stage = root.querySelector('[data-testid="room-stage"]');
    const boardWrap = root.querySelector('[data-testid="room-board-wrap"]');
    const stageDock = root.querySelector('[data-testid="room-stage-dock"]');
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;

    expect(
      root.querySelector('[data-testid="room-compact-header"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(stageHost?.className).toContain('block');
    expect(stageHost?.className).toContain('min-h-0');
    expect(stageHost?.className).toContain('min-w-0');
    expect(
      root.querySelector('[data-testid="room-sidebar-room-id"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-share-chip"]'),
    ).not.toBeNull();
    expect(
      stage?.querySelector('[data-testid="room-share-chip"]'),
    ).not.toBeNull();
    expect(
      stage?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).not.toBeNull();
    expect(boardWrap).not.toBeNull();
    expect(stageDock).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).not.toBeNull();
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).toBeNull();
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-board"]'),
    ).not.toBeNull();
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-hud"]'),
    ).toBeNull();
    expect(shareChipButton?.textContent).toContain(i18n.t('room.hero.share'));
    expect(shareChipButton?.getAttribute('role')).toBe('button');
    expect(shareChipButton?.getAttribute('tabindex')).toBe('0');
    expect(shareChipButton?.getAttribute('title')).toContain(
      i18n.t('room.connection.connected'),
    );
    expect(
      root.querySelector('[data-testid="room-sidebar-share-url"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-copy"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-connection"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-next-match-panel"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-move-log-panel"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat-list"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat-composer"]'),
    ).not.toBeNull();
    expect(
      root.querySelectorAll('[data-testid="room-sidebar-chat-metric"]'),
    ).toHaveLength(2);
    const blackPlayer = root.querySelector(
      '[data-testid="room-player-black"]',
    ) as HTMLElement | null;
    const whitePlayer = root.querySelector(
      '[data-testid="room-player-white"]',
    ) as HTMLElement | null;

    expect(blackPlayer).not.toBeNull();
    expect(whitePlayer).not.toBeNull();
    expect(
      blackPlayer?.querySelector('[data-testid="room-player-black-status"]'),
    ).not.toBeNull();
    expect(
      blackPlayer?.querySelector('[data-testid="room-player-black-presence"]'),
    ).not.toBeNull();
    expect(
      whitePlayer?.querySelector('[data-testid="room-player-white-status"]'),
    ).not.toBeNull();
    expect(
      whitePlayer?.querySelector('[data-testid="room-player-white-presence"]'),
    ).not.toBeNull();
    expect(blackPlayer?.textContent).not.toContain(i18n.playerLabel('black'));
    expect(whitePlayer?.textContent).not.toContain(i18n.playerLabel('white'));
    expect(root.textContent).not.toContain(
      i18n.t('room.sidebar.decorative_avatar'),
    );
  });

  it('keeps the match status hud inside the board column while the share chip stays docked separately', async () => {
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
    const boardWrap = root.querySelector('[data-testid="room-board-wrap"]');
    const stageDock = root.querySelector('[data-testid="room-stage-dock"]');

    expect(
      boardWrap?.querySelector('[data-testid="room-stage-board"]'),
    ).not.toBeNull();
    expect(
      boardWrap?.querySelector('[data-testid="room-stage-hud"]'),
    ).not.toBeNull();
    expect(stageDock).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-hud"]'),
    ).toBeNull();
  });

  it('omits the stage dock when no share URL is available', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
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
      participantId: 'host-1',
      participantToken: 'token-1',
      shareUrl: null,
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(
      root.querySelector('[data-testid="room-stage-board"]'),
    ).not.toBeNull();
    expect(root.querySelector('[data-testid="room-stage-dock"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).toBeNull();
  });

  it('keeps the share chip available beneath the empty stage content before the match starts', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const stageEmpty = root.querySelector('[data-testid="room-stage-empty"]');
    const stageDock = root.querySelector('[data-testid="room-stage-dock"]');

    expect(stageEmpty).not.toBeNull();
    expect(root.querySelector('[data-testid="room-board-wrap"]')).toBeNull();
    expect(stageDock).not.toBeNull();
    expect(
      stageDock?.querySelector('[data-testid="room-stage-share-anchor"]'),
    ).not.toBeNull();
  });

  it('renders the sidebar action area below chat with back-to-lobby and without finalize score', async () => {
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
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const chatSection = root.querySelector('[data-testid="room-sidebar-chat"]');
    const actionsSection = root.querySelector(
      '[data-testid="room-sidebar-actions"]',
    );

    expect(actionsSection).not.toBeNull();
    expect(actionsSection?.textContent).toContain(
      i18n.t('room.page.back_to_lobby'),
    );
    expect(actionsSection?.textContent).toContain(i18n.t('common.move.pass'));
    expect(actionsSection?.textContent).toContain(i18n.t('common.move.resign'));
    expect(actionsSection?.textContent).not.toContain(
      i18n.t('room.participants.finalize_score'),
    );

    if (!chatSection || !actionsSection) {
      throw new Error('Expected chat and actions sections to render');
    }

    expect(
      !!(
        chatSection.compareDocumentPosition(actionsSection) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ),
    ).toBe(true);
  });

  it('renders the missing-room state inside the new shell without the old header', async () => {
    const roomService = createRoomServiceStub({
      snapshot: null,
      participantId: null,
      participantToken: null,
      bootstrapState: 'missing',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(
      root.querySelector('[data-testid="room-compact-header"]'),
    ).toBeNull();
    expect(root.textContent).toContain(i18n.t('room.page.missing.title'));
    expect(root.textContent).toContain(i18n.t('room.page.missing.action'));
  });

  it('does not show an auto-start dialog or sidebar notice when the next match starts', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
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
      participantId: 'host-1',
      participantToken: 'token-1',
      lastNotice: 'The next match has started.',
      lastSystemNotice: {
        id: 'notice-auto-start',
        message: createMessage('room.notice.match_started_auto', {
          mode: createMessage('common.mode.go'),
        }),
        createdAt: '2026-03-20T00:06:00.000Z',
      },
    });

    const harness = await renderOnlineRoomPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(queryDialog('room-auto-start-dialog')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-auto-start-dialog"]'),
    ).toBeNull();
    expect(document.body.textContent).not.toContain(
      i18n.t('room.dialog.auto_start.title'),
    );
    expect(
      root.querySelector('[data-testid="room-sidebar-message-notice"]'),
    ).toBeNull();
  });
});
