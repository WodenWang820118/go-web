import { Base } from 'primeng/base';
import { createMessage } from '@gx/go/domain';
import { vi } from 'vitest';
import {
  clearPrimeNGStyles,
  createRoomServiceStub,
  createSnapshot,
  queryDialog,
  queryPrimeNGStyle,
  queryPrimeNGStyles,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

describe('OnlineRoomPageComponent > style integration', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('injects the PrimeNG theme styles before rendering room dialogs', async () => {
    clearPrimeNGStyles();
    expect(queryPrimeNGStyles()).toHaveLength(0);

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

    await renderOnlineRoomPage(roomService);
    expect(queryDialog('room-rematch-dialog')).not.toBeNull();
    await vi.waitFor(() => {
      expect(queryPrimeNGStyle('dialog-variables')).not.toBeNull();
    });

    const dialogVariablesStyle = queryPrimeNGStyle('dialog-variables');

    expect(queryPrimeNGStyles()).not.toHaveLength(0);
    expect(dialogVariablesStyle).not.toBeNull();
    expect(dialogVariablesStyle?.textContent).toMatch(
      /--p-dialog-background\s*:/,
    );
  });

  it('safely clears PrimeNG styles when the base registry is unavailable', () => {
    expect(() => clearPrimeNGStyles(undefined)).not.toThrow();
    expect(queryPrimeNGStyles()).toHaveLength(0);
  });

  it('resets the PrimeNG base style registry when available', () => {
    if (
      typeof Base === 'undefined' ||
      typeof Base.clearLoadedStyleNames !== 'function'
    ) {
      expect(true).toBe(true);
      return;
    }

    const clearLoadedStyleNamesSpy = vi.spyOn(Base, 'clearLoadedStyleNames');

    try {
      clearPrimeNGStyles();
      expect(clearLoadedStyleNamesSpy).toHaveBeenCalledTimes(1);
    } finally {
      clearLoadedStyleNamesSpy.mockRestore();
    }
  });

  it('removes PrimeNG style tags without touching unrelated styles', () => {
    const dialogStyle = document.createElement('style');
    dialogStyle.dataset.primengStyleId = 'dialog-variables';
    const layerStyle = document.createElement('style');
    layerStyle.dataset.primengStyleId = 'layer-order';
    const appStyle = document.createElement('style');
    appStyle.dataset.testid = 'app-style';
    appStyle.textContent = '.app-shell { color: red; }';

    document.head.append(dialogStyle, layerStyle, appStyle);

    try {
      clearPrimeNGStyles();

      expect(queryPrimeNGStyles()).toHaveLength(0);
      expect(document.head.contains(appStyle)).toBe(true);
    } finally {
      appStyle.remove();
    }
  });
});
