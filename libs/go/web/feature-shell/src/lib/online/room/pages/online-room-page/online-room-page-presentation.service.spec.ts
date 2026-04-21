import { TestBed } from '@angular/core/testing';
import {
  type HostedMatchSnapshot,
  type HostedRematchState,
  type ParticipantSummary,
} from '@gx/go/contracts';
import {
  createParticipantSummary,
  createRoomSnapshot,
} from '@gx/go/contracts/testing';
import { createBoard, createMessage } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomPagePresentationService } from './online-room-page-presentation.service';

describe('OnlineRoomPagePresentationService', () => {
  let service: OnlineRoomPagePresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OnlineRoomPagePresentationService,
        {
          provide: GoI18nService,
          useValue: createI18n(),
        },
      ],
    });

    service = TestBed.inject(OnlineRoomPagePresentationService);
  });

  it('builds the blocked stage when auto-start requires a seat change', () => {
    const snapshot = createRoomSnapshot({
      seatState: {
        black: 'host-1',
        white: 'guest-1',
      },
      autoStartBlockedUntilSeatChange: true,
    });

    expect(service.buildRoomStageViewModel(snapshot, null)).toEqual({
      label: 'Blocked',
      title: 'Seat change required',
      description: 'A player must change seats before the next match starts.',
    });
  });

  it('returns null stage once a hosted match is already active', () => {
    expect(
      service.buildRoomStageViewModel(
        createRoomSnapshot(),
        createHostedMatch(),
      ),
    ).toBeNull();
  });

  it('builds loading and missing status views', () => {
    expect(service.buildRoomLoadingStatusView('ROOM42')).toEqual({
      eyebrow: '#ROOM42',
      title: 'Loading room',
      description: null,
      actionLabel: null,
    });
    expect(service.buildRoomMissingStatusView()).toEqual({
      eyebrow: 'Room unavailable',
      title: 'Room not found',
      description: 'This room no longer exists.',
      actionLabel: 'Back to lobby',
    });
  });

  it('builds seat models with occupant, claim, and viewer-seat state', () => {
    const black = createParticipantSummary({
      participantId: 'host-1',
      displayName: 'Host',
      seat: 'black',
    });
    const guest = createParticipantSummary({
      participantId: 'guest-1',
      displayName: 'Guest',
      isHost: false,
      seat: null,
    });
    const snapshot = createRoomSnapshot({
      participants: [black, guest],
      seatState: {
        black: black.participantId,
        white: null,
      },
    });

    expect(
      service.buildRoomSeatViewModels(snapshot, {
        participantId: guest.participantId,
        viewerSeat: 'black',
        canChangeSeats: true,
      }),
    ).toEqual([
      expect.objectContaining({
        color: 'black',
        occupant: black,
        canClaim: false,
        isViewerSeat: true,
      }),
      expect.objectContaining({
        color: 'white',
        occupant: null,
        canClaim: true,
        isViewerSeat: false,
      }),
    ]);
  });

  it('does not allow spectators or locked viewers to claim an open seat', () => {
    const snapshot = createRoomSnapshot({
      seatState: {
        black: null,
        white: null,
      },
    });

    expect(
      service.buildRoomSeatViewModels(snapshot, {
        participantId: null,
        viewerSeat: null,
        canChangeSeats: true,
      }),
    ).toEqual([
      expect.objectContaining({
        color: 'black',
        canClaim: false,
      }),
      expect.objectContaining({
        color: 'white',
        canClaim: false,
      }),
    ]);
    expect(
      service.buildRoomSeatViewModels(snapshot, {
        participantId: 'viewer-1',
        viewerSeat: null,
        canChangeSeats: false,
      }),
    ).toEqual([
      expect.objectContaining({
        color: 'black',
        canClaim: false,
      }),
      expect.objectContaining({
        color: 'white',
        canClaim: false,
      }),
    ]);
  });

  it('treats only unfinished matches as live', () => {
    expect(service.isLiveHostedMatch(createHostedMatch())).toBe(true);
    expect(
      service.isLiveHostedMatch(createHostedMatch({ phase: 'finished' })),
    ).toBe(false);
  });

  it('resolves rematch viewer seat and status cards', () => {
    const participants: ParticipantSummary[] = [
      createParticipantSummary({
        participantId: 'host-1',
        displayName: 'Host',
        seat: 'black',
      }),
      createParticipantSummary({
        participantId: 'guest-1',
        displayName: 'Guest',
        isHost: false,
        seat: 'white',
      }),
    ];
    const rematch: HostedRematchState = {
      participants: {
        black: 'host-1',
        white: 'guest-1',
      },
      responses: {
        black: 'accepted',
        white: 'pending',
      },
    };

    expect(service.findRoomRematchViewerSeat('guest-1', rematch)).toBe('white');
    expect(
      service.buildRoomRematchStatuses(participants, rematch, 'guest-1'),
    ).toEqual([
      {
        color: 'black',
        name: 'Host',
        response: 'accepted',
        isViewer: false,
      },
      {
        color: 'white',
        name: 'Guest',
        response: 'pending',
        isViewer: true,
      },
    ]);
  });

  it('maps connection states to localized labels', () => {
    expect(service.connectionStateLabel('idle')).toBe('Offline');
    expect(service.connectionStateLabel('connecting')).toBe('Connecting');
    expect(service.connectionStateLabel('connected')).toBe('Connected');
    expect(service.connectionStateLabel('disconnected')).toBe('Reconnecting');
  });

  it('builds sidebar messages in priority order and adds rematch warnings', () => {
    const messages = service.buildRoomSidebarMessages({
      lastError: 'Join failed',
      lastNotice: 'Seat updated',
      lastSystemNotice: {
        id: 'notice-1',
        createdAt: '2026-03-20T00:00:00.000Z',
        message: createMessage('room.notice.other'),
      },
      connectionWarning: 'Realtime unavailable',
      match: createHostedMatch({ phase: 'finished' }),
      rematch: null,
      autoStartBlockedUntilSeatChange: true,
    });

    expect(messages).toEqual([
      {
        tone: 'error',
        message: 'Join failed',
        testId: 'room-sidebar-message-error',
      },
      {
        tone: 'notice',
        message: 'Seat updated',
        testId: 'room-sidebar-message-notice',
      },
      {
        tone: 'warning',
        message: 'Realtime unavailable',
        testId: 'room-sidebar-message-warning',
      },
      {
        tone: 'warning',
        message: 'Rematch blocked until a seat changes.',
        testId: 'room-sidebar-message-rematch-blocked',
      },
    ]);
  });

  it('suppresses the duplicate auto-start system notice in the sidebar', () => {
    const messages = service.buildRoomSidebarMessages({
      lastError: null,
      lastNotice: 'Match started automatically',
      lastSystemNotice: {
        id: 'notice-2',
        createdAt: '2026-03-20T00:00:00.000Z',
        message: createMessage('room.notice.match_started_auto'),
      },
      connectionWarning: null,
      match: null,
      rematch: null,
      autoStartBlockedUntilSeatChange: false,
    });

    expect(messages).toEqual([]);
  });

  it('builds the board section from interactivity and finished-match status', () => {
    const section = service.buildRoomBoardSection({
      lastPlacedPoint: {
        x: 3,
        y: 4,
      },
      canInteractBoard: true,
      realtimeConnected: false,
      match: createHostedMatch({
        phase: 'finished',
        result: {
          winner: 'black',
          reason: 'count',
          summary: createMessage('room.result.count'),
        },
      }),
    });

    expect(section).toEqual({
      lastPlacedPoint: {
        x: 3,
        y: 4,
      },
      interactive: false,
      statusLine: 'translated:room.result.count',
    });
  });

  it('hides the board status line for resigned matches', () => {
    expect(
      service.buildMatchStatusLine(
        createHostedMatch({
          phase: 'finished',
          result: {
            winner: 'white',
            reason: 'resign',
            summary: createMessage('room.result.resign'),
          },
        }),
      ),
    ).toBeNull();
  });
});

function createHostedMatch(
  options: {
    phase?: HostedMatchSnapshot['state']['phase'];
    result?: HostedMatchSnapshot['state']['result'];
  } = {},
): HostedMatchSnapshot {
  return {
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
      board: createBoard(19),
      phase: options.phase ?? 'playing',
      nextPlayer: 'black',
      captures: {
        black: 0,
        white: 0,
      },
      moveHistory: [],
      previousBoardHashes: [],
      result: options.result ?? null,
      lastMove: null,
      consecutivePasses: 0,
      winnerLine: [],
      message: createMessage('game.state.next_turn', {
        player: createMessage('common.player.black'),
      }),
      scoring: null,
    },
    startedAt: '2026-03-20T00:05:00.000Z',
  };
}

function createI18n() {
  return {
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'room.stage.blocked.label') {
        return 'Blocked';
      }

      if (key === 'room.stage.blocked.title') {
        return 'Seat change required';
      }

      if (key === 'room.stage.blocked.description') {
        return 'A player must change seats before the next match starts.';
      }

      if (key === 'room.stage.ready.label') {
        return 'Ready';
      }

      if (key === 'room.stage.ready.title') {
        return 'Ready to start';
      }

      if (key === 'room.stage.ready.description') {
        return 'Both players are seated.';
      }

      if (key === 'room.stage.waiting.label') {
        return 'Waiting';
      }

      if (key === 'room.stage.waiting.title') {
        return 'Waiting for players';
      }

      if (key === 'room.stage.waiting.description') {
        return 'At least one seat is still open.';
      }

      if (key === 'room.hero.title') {
        return `#${String(params?.roomId ?? '')}`;
      }

      if (key === 'room.hero.loading_title') {
        return 'Loading room';
      }

      if (key === 'room.page.loading') {
        return 'Loading room';
      }

      if (key === 'room.page.missing.label') {
        return 'Room unavailable';
      }

      if (key === 'room.page.missing.title') {
        return 'Room not found';
      }

      if (key === 'room.page.missing.description') {
        return 'This room no longer exists.';
      }

      if (key === 'room.page.missing.action') {
        return 'Back to lobby';
      }

      if (key === 'room.connection.connected') {
        return 'Connected';
      }

      if (key === 'room.connection.connecting') {
        return 'Connecting';
      }

      if (key === 'room.connection.reconnecting') {
        return 'Reconnecting';
      }

      if (key === 'room.connection.offline') {
        return 'Offline';
      }

      if (key === 'room.rematch.blocked') {
        return 'Rematch blocked until a seat changes.';
      }

      return key;
    },
    translateMessage: (message: { key: string } | null | undefined) =>
      message ? `translated:${message.key}` : '',
    playerLabel: (color: 'black' | 'white') =>
      color === 'black' ? 'Black Player' : 'White Player',
  };
}
