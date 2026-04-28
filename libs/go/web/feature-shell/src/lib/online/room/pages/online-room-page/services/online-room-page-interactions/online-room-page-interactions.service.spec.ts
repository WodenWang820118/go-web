import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GoAnalyticsService } from '@gx/go/state';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { createHostedMatch } from '../../online-room-page.test-support';
import { OnlineRoomPageViewStateService } from '../online-room-page-view-state/online-room-page-view-state.service';
import { OnlineRoomPageInteractionsService } from './online-room-page-interactions.service';

describe('OnlineRoomPageInteractionsService analytics', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('tracks hosted match action events with safe low-cardinality payloads', () => {
    const match = signal(createHostedMatch({ mode: 'go' }));
    const onlineRoom = {
      canInteractBoard: signal(true),
      claimSeat: vi.fn(),
      displayName: signal('Host'),
      joinRoom: vi.fn().mockReturnValue(of(void 0)),
      releaseSeat: vi.fn(),
      sendChat: vi.fn(),
      sendGameCommand: vi.fn(),
    };
    const analytics = {
      track: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OnlineRoomPageInteractionsService,
        {
          provide: OnlineRoomService,
          useValue: onlineRoom,
        },
        {
          provide: OnlineRoomPageViewStateService,
          useValue: {
            match,
            roomId: signal('ROOM42'),
            snapshot: signal(null),
          },
        },
        {
          provide: GoAnalyticsService,
          useValue: analytics,
        },
      ],
    });

    const service = TestBed.inject(OnlineRoomPageInteractionsService);
    TestBed.flushEffects();

    service.onBoardPoint({ x: 3, y: 3 });
    match.set(
      createHostedMatch({
        mode: 'go',
        phase: 'scoring',
      }),
    );
    service.onBoardPoint({ x: 4, y: 4 });
    service.passTurn();
    service.resign();
    service.confirmScoring();
    service.disputeScoring();
    service.guessNigiri('odd');

    expect(analytics.track.mock.calls.map(([event]) => event)).toEqual([
      {
        action_type: 'place',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'hosted',
      },
      {
        action_type: 'toggle_dead',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'hosted',
      },
      {
        action_type: 'pass',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'hosted',
      },
      {
        action_type: 'resign',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'hosted',
      },
      {
        action_type: 'confirm_scoring',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'hosted',
      },
      {
        action_type: 'dispute_scoring',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'hosted',
      },
      {
        action_type: 'nigiri_guess',
        event: 'gx_match_action',
        game_mode: 'go',
        play_context: 'hosted',
      },
    ]);
  });
});
