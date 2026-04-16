import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
import { OnlineRoomService } from '../services/online-room/online-room.service';

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
    expect(root.querySelector('.room-sidebar__identity')).toBeNull();
    expect(root.querySelector('.room-sidebar__viewer-card')).toBeNull();
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

  it('shows the rematch controls for seated players inside the sidebar after a finished match', async () => {
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
              Array.from({ length: 15 }, () => null)
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

    expect(root.querySelector('[data-testid="room-sidebar-rematch"]')).not.toBeNull();
    expect(root.textContent).toContain(i18n.t('room.rematch.title'));
    expect(root.textContent).toContain(i18n.t('room.rematch.accept'));
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
              Array.from({ length: 15 }, () => null)
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
    const stage = root.querySelector('.room-stage');
    const boardWrap = root.querySelector('.room-stage__board-wrap');
    const shareChipButton = root.querySelector(
      '[data-testid="room-share-chip-button"]'
    ) as HTMLButtonElement | null;

    expect(root.querySelector('[data-testid="room-compact-header"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-room-id"]')).toBeNull();
    expect(root.querySelector('.room-layout__share-rail')).toBeNull();
    expect(root.querySelector('[data-testid="room-share-chip"]')).not.toBeNull();
    expect(stage?.querySelector('[data-testid="room-share-chip"]')).not.toBeNull();
    expect(stage?.querySelector('.room-stage__share-anchor')).not.toBeNull();
    expect(boardWrap).not.toBeNull();
    expect(boardWrap?.querySelector('.room-stage__share-anchor')).not.toBeNull();
    expect(boardWrap?.classList.contains('room-stage__board-wrap--with-hud')).toBe(false);
    expect(boardWrap?.querySelector('.room-stage__board')).not.toBeNull();
    expect(boardWrap?.querySelector('.room-stage__hud')).toBeNull();
    expect(shareChipButton?.textContent).toContain(i18n.t('room.hero.share'));
    expect(shareChipButton?.getAttribute('title')).toContain(i18n.t('room.connection.connected'));
    expect(root.querySelector('[data-testid="room-sidebar-share-url"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-copy"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-connection"]')).toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-next-match-panel"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-move-log-panel"]')).toBeNull();
    expect(root.querySelector('.room-sidebar__stats')).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-chat"]')).not.toBeNull();
    expect(root.querySelectorAll('.room-sidebar__chat-metric')).toHaveLength(2);
    expect(root.querySelector('[data-testid="room-player-black"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="room-player-white"]')).not.toBeNull();
  });

  it('keeps chat message copy dark against the light chat cards', async () => {
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
    const chatCopy = root.querySelector('.room-sidebar__chat-copy') as HTMLElement | null;
    const sidebarStyles = readSidebarStyles();

    expect(chatCopy).not.toBeNull();
    expect(sidebarStyles).toMatch(
      /\.room-sidebar__chat-copy,\s*\.room-sidebar__chat-empty\s*\{\s*color:\s*#251d15;/s
    );
  });

  it('keeps the empty chat state dark against the light chat surface', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderPage(roomService);
    const root = harness.routeNativeElement as HTMLElement;
    const emptyState = root.querySelector('.room-sidebar__chat-empty') as HTMLElement | null;
    const sidebarStyles = readSidebarStyles();

    expect(emptyState).not.toBeNull();
    expect(sidebarStyles).not.toMatch(
      /\.room-sidebar__section-copy,\s*\.room-sidebar__helper,\s*\.room-sidebar__chat-copy,\s*\.room-sidebar__chat-empty,\s*\.room-sidebar__rematch-seat,\s*\.player-card__seat/s
    );
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

    expect(
      root.querySelector('[data-testid="room-sidebar-message-warning"]')?.textContent
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
    expect(root.querySelector('[data-testid="room-sidebar-chat"]')).not.toBeNull();
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
              Array.from({ length: 19 }, () => null)
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
    const actionsSection = root.querySelector('[data-testid="room-sidebar-actions"]');

    expect(actionsSection).not.toBeNull();
    expect(root.querySelector('.room-sidebar__topbar')).toBeNull();
    expect(actionsSection?.textContent).toContain(i18n.t('room.page.back_to_lobby'));
    expect(actionsSection?.textContent).toContain(i18n.t('common.move.pass'));
    expect(actionsSection?.textContent).toContain(i18n.t('common.move.resign'));
    expect(actionsSection?.textContent).not.toContain(i18n.t('room.participants.finalize_score'));

    if (!chatSection || !actionsSection) {
      throw new Error('Expected chat and actions sections to render');
    }

    expect(
      !!(chatSection.compareDocumentPosition(actionsSection) & Node.DOCUMENT_POSITION_FOLLOWING)
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
      '[data-testid="room-share-chip-button"]'
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
      i18n.t('room.hero.copy_link')
    );
    expect(root.querySelector('[data-testid="room-sidebar-share-url"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-sidebar-copy"]')).toBeNull();
    expect(root.querySelector('.room-sidebar__topbar')).toBeNull();

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const feedback = root.querySelector(
      '[data-testid="room-share-chip-feedback"]'
    ) as HTMLElement | null;

    expect(writeText).toHaveBeenCalledWith('http://localhost/online/room/ROOM42');
    expect(feedback?.textContent).toContain(i18n.t('room.hero.copy_complete'));
    expect(feedback?.getAttribute('role')).toBe('status');
    expect(feedback?.getAttribute('aria-live')).toBe('polite');
    expect(root.querySelector('[data-testid="room-share-chip-manual"]')).toBeNull();
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
      '[data-testid="room-share-chip-button"]'
    ) as HTMLButtonElement | null;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const manualPanel = root.querySelector(
      '[data-testid="room-share-chip-manual"]'
    ) as HTMLElement | null;
    const manualUrl = root.querySelector(
      '[data-testid="room-share-chip-manual-url"]'
    ) as HTMLInputElement | null;
    const dismissButton = root.querySelector(
      '[data-testid="room-share-chip-manual-dismiss"]'
    ) as HTMLButtonElement | null;

    expect(root.querySelector('[data-testid="room-share-chip-feedback"]')).toBeNull();
    expect(manualPanel?.textContent).toContain(
      i18n.t('room.hero.copy_failed')
    );
    expect(shareChipButton?.getAttribute('aria-label')).toContain(
      i18n.t('room.hero.retry_copy_link')
    );
    expect(manualUrl?.value).toBe('http://localhost/online/room/ROOM42');
    expect(manualUrl?.readOnly).toBe(true);
    expect(manualUrl?.getAttribute('aria-label')).toBe(i18n.t('room.hero.manual_url_label'));
    expect(manualPanel?.textContent).toContain(
      i18n.t('room.hero.copy_manual_instruction')
    );

    dismissButton?.click();
    await harness.fixture.whenStable();

    expect(root.querySelector('[data-testid="room-share-chip-manual"]')).toBeNull();
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
      '[data-testid="room-share-chip-button"]'
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

    expect(writeText).toHaveBeenCalledWith('http://localhost/online/room/ROOM42');
    expect(root.querySelector('[data-testid="room-share-chip-feedback"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-share-chip-manual"]')).not.toBeNull();
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
      '[data-testid="room-share-chip-button"]'
    ) as HTMLButtonElement | null;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    shareChipButton?.click();
    await harness.fixture.whenStable();

    const manualPanel = root.querySelector(
      '[data-testid="room-share-chip-manual"]'
    ) as HTMLElement | null;

    manualPanel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await harness.fixture.whenStable();

    expect(root.querySelector('[data-testid="room-share-chip-manual"]')).toBeNull();
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

    expect(root.querySelector('[data-testid="room-compact-header"]')).toBeNull();
    expect(root.textContent).toContain(i18n.t('room.page.missing.title'));
    expect(root.textContent).toContain(i18n.t('room.page.missing.action'));
  });

  it('keeps rematch controls inside the sidebar shell after a finished match', async () => {
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
              Array.from({ length: 15 }, () => null)
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
    const boardWrap = root.querySelector('.room-stage__board-wrap');

    expect(root.querySelector('[data-testid="room-sidebar-rematch"]')).not.toBeNull();
    expect(root.textContent).toContain(i18n.t('room.rematch.title'));
    expect(root.textContent).toContain(i18n.t('room.rematch.accept'));
    expect(boardWrap).not.toBeNull();
    expect(boardWrap?.querySelector('.room-stage__share-anchor')).not.toBeNull();
    expect(boardWrap?.classList.contains('room-stage__board-wrap--with-hud')).toBe(true);
    expect(boardWrap?.querySelector('.room-stage__board')).not.toBeNull();
    expect(boardWrap?.querySelector('.room-stage__hud')).not.toBeNull();
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
  bootstrapState?: 'idle' | 'loading' | 'ready' | 'missing';
  connectionState?: 'idle' | 'connecting' | 'connected' | 'disconnected';
}) {
  const snapshot = signal(options.snapshot);
  const participantId = signal(options.participantId);
  const participantToken = signal(options.participantToken);
  const displayName = signal('Host');
  const bootstrapState = signal<'idle' | 'loading' | 'ready' | 'missing'>(
    options.bootstrapState ?? 'ready'
  );
  const connectionState = signal<'idle' | 'connecting' | 'connected' | 'disconnected'>(
    options.connectionState ?? 'connected'
  );
  const lastError = signal<string | null>(null);
  const lastNotice = signal<string | null>(null);
  const match = computed(() => snapshot()?.match ?? null);
  const participants = computed(() => snapshot()?.participants ?? []);
  const nextMatchSettings = computed(() => snapshot()?.nextMatchSettings ?? null);
  const rematch = computed(() => snapshot()?.rematch ?? null);
  const autoStartBlockedUntilSeatChange = computed(
    () => snapshot()?.autoStartBlockedUntilSeatChange ?? false
  );
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

function readSidebarStyles(): string {
  return readFileSync(
    resolve(
      process.cwd(),
      'src/lib/online/room/online-room-sidebar/online-room-sidebar.component.css'
    ),
    'utf8'
  );
}
