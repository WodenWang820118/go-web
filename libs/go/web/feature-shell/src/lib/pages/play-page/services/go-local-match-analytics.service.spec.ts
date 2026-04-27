import '@angular/compiler';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createMessage, MatchSettings, MatchState } from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { GameSessionStore } from '@gx/go/state/session';
import { vi } from 'vitest';
import { GoLocalMatchAnalyticsService } from './go-local-match-analytics.service';

describe('GoLocalMatchAnalyticsService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('tracks first move and finished local match once with non-PII winner values', () => {
    const settings = createSettings();
    const state = signal(createState());
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
        GoLocalMatchAnalyticsService,
        {
          provide: GameSessionStore,
          useValue: {
            snapshot: computed(() => ({
              settings,
              state: state(),
            })),
          },
        },
        {
          provide: GoAnalyticsService,
          useValue: analytics,
        },
      ],
    });

    TestBed.inject(GoLocalMatchAnalyticsService);
    TestBed.flushEffects();
    expect(analytics.trackOnce).not.toHaveBeenCalled();

    state.set(
      createState({
        moveHistory: [createMoveRecord('move-1')],
      }),
    );
    TestBed.flushEffects();
    TestBed.flushEffects();

    state.set(
      createState({
        lastMove: createMoveRecord('move-12', 12),
        moveHistory: [
          createMoveRecord('move-1'),
          createMoveRecord('move-12', 12),
        ],
        phase: 'finished',
        result: {
          reason: 'score',
          summary: createMessage('game.result.win_by_points'),
          winner: 'black',
        },
      }),
    );
    TestBed.flushEffects();
    TestBed.flushEffects();

    expect(trackedEvents).toEqual([
      {
        board_size: 19,
        event: 'gx_match_first_move',
        game_mode: 'go',
        play_context: 'local',
      },
      {
        board_size: 19,
        event: 'level_end',
        game_mode: 'go',
        level_name: 'local_go_19',
        move_count: 2,
        play_context: 'local',
        result_reason: 'score',
        success: true,
        winner: 'black',
      },
    ]);
  });
});

function createSettings(): MatchSettings {
  return {
    boardSize: 19,
    komi: 6.5,
    mode: 'go',
    players: {
      black: 'Alice',
      white: 'Bob',
    },
  };
}

function createState(overrides: Partial<MatchState> = {}): MatchState {
  return {
    board: Array.from({ length: 19 }, () =>
      Array.from({ length: 19 }, () => null),
    ),
    boardSize: 19,
    captures: {
      black: 0,
      white: 0,
    },
    consecutivePasses: 0,
    lastMove: null,
    message: createMessage('game.go.state.black_to_move'),
    mode: 'go',
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
        x: 3,
        y: 3,
      },
      type: 'place',
    },
    id,
    moveNumber,
    notation: 'D4',
    phaseAfterMove: 'playing',
    player: 'black',
  };
}
