import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HostedMatchSnapshot } from '@gx/go/contracts';
import { createMessage, MatchState } from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { OnlineRoomService } from '../../../services/online-room/online-room.service';
import { GoHostedMatchAnalyticsService } from './go-hosted-match-analytics.service';
import { vi } from 'vitest';

describe('GoHostedMatchAnalyticsService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('tracks first move and finished hosted match once by startedAt', () => {
    const match = signal<HostedMatchSnapshot | null>(null);
    const trackedEvents: unknown[] = [];
    const trackedKeys = new Set<string>();
    const analytics = {
      trackOnce: vi.fn((key: string, event: unknown) => {
        if (trackedKeys.has(key)) {
          return;
        }

        trackedKeys.add(key);
        trackedEvents.push(event);
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        GoHostedMatchAnalyticsService,
        {
          provide: OnlineRoomService,
          useValue: {
            match,
          },
        },
        {
          provide: GoAnalyticsService,
          useValue: analytics,
        },
      ],
    });

    TestBed.inject(GoHostedMatchAnalyticsService);
    TestBed.flushEffects();
    expect(analytics.trackOnce).not.toHaveBeenCalled();

    match.set(
      createMatch({
        state: createState({
          moveHistory: [createMoveRecord('move-1')],
        }),
      }),
    );
    TestBed.flushEffects();
    TestBed.flushEffects();

    match.set(
      createMatch({
        state: createState({
          lastMove: createMoveRecord('move-12', 12),
          moveHistory: [
            createMoveRecord('move-1'),
            createMoveRecord('move-12', 12),
          ],
          phase: 'finished',
          result: {
            reason: 'resign',
            resignedBy: 'white',
            summary: createMessage('game.result.win_by_resignation'),
            winner: 'black',
          },
        }),
      }),
    );
    TestBed.flushEffects();
    TestBed.flushEffects();

    match.set(
      createMatch({
        startedAt: '2026-04-24T00:10:00.000Z',
      }),
    );
    TestBed.flushEffects();
    TestBed.flushEffects();

    expect(trackedEvents).toEqual([
      {
        board_size: 15,
        event: 'gx_match_first_move',
        game_mode: 'gomoku',
        play_context: 'hosted',
      },
      {
        board_size: 15,
        event: 'level_end',
        game_mode: 'gomoku',
        level_name: 'hosted_gomoku_15',
        move_count: 2,
        play_context: 'hosted',
        result_reason: 'resign',
        success: true,
        winner: 'black',
      },
      {
        board_size: 15,
        event: 'level_start',
        game_mode: 'gomoku',
        level_name: 'hosted_gomoku_15',
        play_context: 'hosted',
        start_source: 'rematch',
      },
    ]);
  });
});

function createMatch(
  overrides: Partial<HostedMatchSnapshot> = {},
): HostedMatchSnapshot {
  return {
    settings: {
      boardSize: 15,
      komi: 0,
      mode: 'gomoku',
      players: {
        black: 'Host',
        white: 'Guest',
      },
    },
    startedAt: '2026-04-24T00:00:00.000Z',
    state: createState(),
    ...overrides,
  };
}

function createState(overrides: Partial<MatchState> = {}): MatchState {
  return {
    board: Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null),
    ),
    boardSize: 15,
    captures: {
      black: 0,
      white: 0,
    },
    consecutivePasses: 0,
    lastMove: null,
    message: createMessage('game.gomoku.state.black_to_move'),
    mode: 'gomoku',
    moveHistory: [],
    nextPlayer: 'black',
    phase: 'playing',
    previousBoardHashes: [],
    result: null,
    scoring: null,
    winnerLine: [],
    ...overrides,
  };
}

function createMoveRecord(
  id: string,
  moveNumber = 1,
): NonNullable<MatchState['lastMove']> {
  return {
    boardHashAfterMove: `${id}-hash`,
    capturedPoints: [],
    capturesAfterMove: {
      black: 0,
      white: 0,
    },
    command: {
      point: {
        x: 7,
        y: 7,
      },
      type: 'place',
    },
    id,
    moveNumber,
    notation: 'H8',
    phaseAfterMove: 'playing',
    player: 'black',
  };
}
