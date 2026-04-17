import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component, computed, signal } from '@angular/core';
import { RoomSnapshot, SystemNotice } from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state';
import { provideGoPrimeNGTheme } from '@gx/go/ui';
import { Theme } from '@primeuix/styled';
import { Base } from 'primeng/base';
import { Dialog } from 'primeng/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OnlineRoomPageComponent } from './online-room-page.component';
import { OnlineRoomService } from '../../services/online-room/online-room.service';
import { OnlineRoomsHttpService } from '../../services/online-rooms-http/online-rooms-http.service';

@Component({
  standalone: true,
  template: '<p>Lobby detail</p>',
})
class DummyLobbyPageComponent {}

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
    expect(text).not.toContain(i18n.t('room.next_match.save'));
  });

  it('does not render a joined-viewer identity card in the sidebar when the viewer is the host', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-identity"]'),
    ).toBeNull();
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

    const text = await renderText(roomService);
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.stage.blocked.label'));
    expect(text).toContain(i18n.t('room.stage.blocked.title'));
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

    const text = await renderText(roomService);
    const i18n = TestBed.inject(GoI18nService);

    expect(text).toContain(i18n.t('room.join.title.spectator'));
    expect(text).toContain(i18n.t('room.join.description.spectator'));
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

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const rematchDialog = queryDialog('room-rematch-dialog');
    const acceptButton = document.body.querySelector(
      '[data-testid="room-rematch-dialog-accept"]',
    ) as HTMLButtonElement | null;
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

    const activeAcceptButton = document.body.querySelector(
      '[data-testid="room-rematch-dialog-accept"]',
    ) as HTMLButtonElement | null;

    activeAcceptButton?.click();
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

    const harness = await renderPage(roomService);
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

    const harness = await renderPage(roomService);
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

  it('injects the PrimeNG theme styles before rendering room dialogs', async () => {
    clearPrimeNGStyles();

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

    await renderPage(roomService);

    expect(queryDialog('room-rematch-dialog')).not.toBeNull();
    expect(queryPrimeNGStyles()).not.toHaveLength(0);
    expect(queryPrimeNGStyle('dialog-variables')).not.toBeNull();
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

    const harness = await renderPage(roomService);
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

    const harness = await renderPage(roomService);
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

    const harness = await renderPage(roomService);
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

    const harness = await renderPage(roomService);
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

  it('renders chat message copy inside the chat panel', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot({
        chat: [
          {
            id: 'chat-1',
            participantId: 'host-1',
            displayName: 'Host',
            message: 'Visible chat copy',
            sentAt: '2026-03-20T00:10:00.000Z',
            system: false,
          },
        ],
      }),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const chatCopy = root.querySelector(
      '[data-testid="room-sidebar-chat-message-chat-1"]',
    ) as HTMLElement | null;
    const chatList = root.querySelector(
      '[data-testid="room-sidebar-chat-list"]',
    ) as HTMLElement | null;
    const composer = root.querySelector(
      '[data-testid="room-sidebar-chat-composer"]',
    ) as HTMLElement | null;

    expect(chatCopy).not.toBeNull();
    expect(chatList).not.toBeNull();
    expect(composer).not.toBeNull();
    expect(chatCopy?.textContent).toContain('Visible chat copy');
  });

  it('renders the empty chat state inside the chat panel', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const emptyState = root.querySelector(
      '[data-testid="room-sidebar-chat-empty"]',
    ) as HTMLElement | null;
    const i18n = TestBed.inject(GoI18nService);

    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain(i18n.t('room.chat.empty'));
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
      '[data-testid="claim-black"]',
    ) as HTMLButtonElement | null;

    expect(
      root.querySelector('[data-testid="room-sidebar-message-warning"]')
        ?.textContent,
    ).toContain(i18n.t('room.client.realtime_unavailable'));
    expect(claimBlackButton).not.toBeNull();
    expect(claimBlackButton?.disabled).toBe(true);
  });

  it('shows the join form inside the new sidebar for visitors who have not joined', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: null,
      participantToken: null,
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat"]'),
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

    const harness = await renderPage(roomService);
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

  it('renders a board-adjacent share chip that copies the room link with success feedback', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    expect(shareChipButton).not.toBeNull();
    expect(shareChipButton?.textContent).toContain(i18n.t('room.hero.share'));
    expect(shareChipButton?.getAttribute('aria-label')).toContain(
      i18n.t('room.hero.copy_link'),
    );
    expect(
      root.querySelector('[data-testid="room-sidebar-share-url"]'),
    ).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-copy"]')).toBeNull();

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const feedback = root.querySelector(
      '[data-testid="room-share-chip-feedback"]',
    ) as HTMLElement | null;

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost/online/room/ROOM42',
    );
    expect(shareChipButton?.textContent).toContain(i18n.t('room.hero.copied'));
    expect(shareChipButton?.getAttribute('aria-label')).toBe(
      i18n.t('room.hero.copy_complete'),
    );
    expect(feedback?.textContent).toContain(i18n.t('room.hero.copy_complete'));
    expect(feedback?.getAttribute('role')).toBe('status');
    expect(feedback?.getAttribute('aria-live')).toBe('polite');
    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).toBeNull();
  });

  it('expands a manual-copy fallback when automatic copy is unavailable', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const manualPanel = root.querySelector(
      '[data-testid="room-share-chip-manual"]',
    ) as HTMLElement | null;
    const manualUrl = root.querySelector(
      '[data-testid="room-share-chip-manual-url"]',
    ) as HTMLInputElement | null;
    const dismissButton = root.querySelector(
      '[data-testid="room-share-chip-manual-dismiss"]',
    ) as HTMLButtonElement | null;

    expect(
      root.querySelector('[data-testid="room-share-chip-feedback"]'),
    ).toBeNull();
    expect(manualPanel?.textContent).toContain(i18n.t('room.hero.copy_failed'));
    expect(shareChipButton?.getAttribute('aria-label')).toContain(
      i18n.t('room.hero.retry_copy_link'),
    );
    expect(manualUrl?.value).toBe('http://localhost/online/room/ROOM42');
    expect(manualUrl?.readOnly).toBe(true);
    expect(manualUrl?.getAttribute('aria-label')).toBe(
      i18n.t('room.hero.manual_url_label'),
    );
    expect(manualPanel?.textContent).toContain(
      i18n.t('room.hero.copy_manual_instruction'),
    );

    dismissButton?.click();
    await harness.fixture.whenStable();

    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).toBeNull();
    expect(shareChipButton?.disabled).toBe(false);
    expect(document.activeElement).toBe(shareChipButton);
  });

  it('expands the manual-copy fallback when clipboard writes are rejected', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost/online/room/ROOM42',
    );
    expect(
      root.querySelector('[data-testid="room-share-chip-feedback"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).not.toBeNull();
  });

  it('dismisses the manual-copy fallback when Escape is pressed', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]',
    ) as HTMLButtonElement | null;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const manualPanel = root.querySelector(
      '[data-testid="room-share-chip-manual"]',
    ) as HTMLElement | null;

    manualPanel?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await harness.fixture.whenStable();

    expect(
      root.querySelector('[data-testid="room-share-chip-manual"]'),
    ).toBeNull();
  });

  it('renders the missing-room state inside the new shell without the old header', async () => {
    const roomService = createRoomServiceStub({
      snapshot: null,
      participantId: null,
      participantToken: null,
      bootstrapState: 'missing',
    });

    const harness = await renderPage(roomService);
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

    const harness = await renderPage(roomService);
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

    const harness = await renderPage(roomService);
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

  it('prompts the host before leaving the room and closes the room after confirmation', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const backButton = root.querySelector(
      '[data-testid="room-back-to-lobby"]',
    ) as HTMLButtonElement | null;

    backButton?.click();
    await harness.fixture.whenStable();

    const leaveDialog = queryDialog('room-leave-dialog');
    const acceptButton = document.body.querySelector(
      '[data-testid="room-leave-dialog-accept"]',
    ) as HTMLButtonElement | null;

    expect(leaveDialog).not.toBeNull();
    expect(router.url).toBe('/online/room/ROOM42');

    acceptButton?.click();
    await harness.fixture.whenStable();

    expect(roomService.closeRoom).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/');
  });

  it('lets the host cancel the leave prompt and stay in the room', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const backButton = root.querySelector(
      '[data-testid="room-back-to-lobby"]',
    ) as HTMLButtonElement | null;

    backButton?.click();
    await harness.fixture.whenStable();

    const rejectButton = document.body.querySelector(
      '[data-testid="room-leave-dialog-reject"]',
    ) as HTMLButtonElement | null;

    rejectButton?.click();
    await harness.fixture.whenStable();

    expect(roomService.closeRoom).not.toHaveBeenCalled();
    expect(router.url).toBe('/online/room/ROOM42');
    expect(queryDialog('room-leave-dialog')).toBeNull();
  });

  it('lets non-host viewers leave immediately without showing the leave prompt', async () => {
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
      participantToken: 'token-2',
    });

    const harness = await renderPage(roomService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const backButton = root.querySelector(
      '[data-testid="room-back-to-lobby"]',
    ) as HTMLButtonElement | null;

    backButton?.click();
    await harness.fixture.whenStable();

    expect(queryDialog('room-leave-dialog')).toBeNull();
    expect(roomService.closeRoom).not.toHaveBeenCalled();
    expect(router.url).toBe('/');
  });

  it('returns guests to the lobby when the host closes the room remotely', async () => {
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
      participantToken: 'token-2',
    });

    const harness = await renderPage(roomService);
    const router = TestBed.inject(Router);

    roomService.roomClosed.set({
      roomId: 'ROOM42',
      message: createMessage('room.notice.closed_by_host'),
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(roomService.clearRoomClosedEvent).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/');
  });

  it('does not re-bootstrap the room when later room-state signal changes occur', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    roomService.bootstrapRoom.mockImplementation(() => {
      roomService.snapshot();
      roomService.connectionState();
    });

    const harness = await renderPage(roomService);

    expect(roomService.bootstrapRoom).toHaveBeenCalledTimes(1);

    roomService.snapshot.set(
      createSnapshot({
        updatedAt: '2026-03-20T00:01:00.000Z',
      }),
    );
    roomService.connectionState.set('disconnected');
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(roomService.bootstrapRoom).toHaveBeenCalledTimes(1);
  });

  it('returns guests to the lobby when the delayed room-closure probe sees 404 after reconnect churn', async () => {
    vi.useFakeTimers();

    try {
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
        participantToken: 'token-2',
      });
      const getRoom = vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
      );

      const harness = await renderPage(roomService, {
        roomsApi: {
          getRoom,
        },
      });
      const router = TestBed.inject(Router);

      roomService.connectionState.set('disconnected');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      roomService.connectionState.set('connecting');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      await vi.advanceTimersByTimeAsync(249);
      await harness.fixture.whenStable();

      expect(getRoom).not.toHaveBeenCalled();
      expect(router.url).toBe('/online/room/ROOM42');

      await vi.advanceTimersByTimeAsync(300);
      await harness.fixture.whenStable();

      expect(getRoom).toHaveBeenCalledTimes(1);
      expect(getRoom).toHaveBeenCalledWith('ROOM42');
      expect(roomService.clearRoomClosedEvent).toHaveBeenCalledTimes(1);
      expect(router.url).toBe('/');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not redirect guests when the delayed room-closure probe survives reconnect churn and the room still exists', async () => {
    vi.useFakeTimers();

    try {
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
        participantToken: 'token-2',
      });
      const getRoom = vi.fn().mockReturnValue(
        of({
          snapshot: createSnapshot(),
        }),
      );

      const harness = await renderPage(roomService, {
        roomsApi: {
          getRoom,
        },
      });
      const router = TestBed.inject(Router);

      roomService.connectionState.set('disconnected');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      roomService.connectionState.set('connecting');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      await vi.advanceTimersByTimeAsync(249);
      await harness.fixture.whenStable();

      expect(getRoom).not.toHaveBeenCalled();
      expect(router.url).toBe('/online/room/ROOM42');

      await vi.advanceTimersByTimeAsync(1500);
      await harness.fixture.whenStable();

      expect(getRoom).toHaveBeenCalledTimes(1);
      expect(getRoom).toHaveBeenCalledWith('ROOM42');
      expect(roomService.clearRoomClosedEvent).not.toHaveBeenCalled();
      expect(router.url).toBe('/online/room/ROOM42');
    } finally {
      vi.useRealTimers();
    }
  });
});

async function renderPage(
  roomService: ReturnType<typeof createRoomServiceStub>,
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

async function renderText(
  roomService: ReturnType<typeof createRoomServiceStub>,
) {
  const harness = await renderPage(roomService);
  return harness.routeNativeElement?.textContent as string;
}

function queryDialog(testId: string): HTMLElement | null {
  return document.body.querySelector(
    `[data-testid="${testId}"]`,
  ) as HTMLElement | null;
}

function queryDialogHeaderClose(
  testId: string,
  closeAriaLabel: string,
): HTMLButtonElement | null {
  return queryDialog(testId)
    ?.closest('.p-dialog')
    ?.querySelector(
      `button[aria-label="${closeAriaLabel}"]`,
    ) as HTMLButtonElement | null;
}

function queryVisibleDialogs(harness: RouterTestingHarness): Dialog[] {
  return harness.fixture.debugElement
    .queryAll(By.directive(Dialog))
    .map((debugElement) => debugElement.componentInstance as Dialog)
    .filter((dialog) => dialog.visible);
}

function clearPrimeNGStyles(): void {
  Base.clearLoadedStyleNames();
  Theme.clearLoadedStyleNames();

  document.head
    .querySelectorAll('style[data-primeng-style-id]')
    .forEach((styleElement) => styleElement.remove());
}

function queryPrimeNGStyle(name: string): HTMLStyleElement | null {
  return document.head.querySelector(
    `style[data-primeng-style-id="${name}"]`,
  ) as HTMLStyleElement | null;
}

function queryPrimeNGStyles(): HTMLStyleElement[] {
  return Array.from(
    document.head.querySelectorAll('style[data-primeng-style-id]'),
  ) as HTMLStyleElement[];
}

function createRoomServiceStub(options: {
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
    markRoomClosed: vi.fn((event: { roomId: string; message: ReturnType<typeof createMessage> }) => {
      roomClosed.set(event);
    }),
    clearTransientMessages: vi.fn(),
    roomClosed,
    clearRoomClosedEvent: vi.fn(() => roomClosed.set(null)),
    closingRoom: signal(false),
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
