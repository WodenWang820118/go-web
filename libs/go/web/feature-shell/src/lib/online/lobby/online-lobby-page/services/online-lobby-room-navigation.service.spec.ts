import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LobbyRoomSummary } from '@gx/go/contracts';
import { GoAnalyticsService } from '@gx/go/state';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OnlineRoomService } from '../../../room/services/online-room/online-room.service';
import { OnlineLobbyRoomNavigationService } from './online-lobby-room-navigation.service';

describe('OnlineLobbyRoomNavigationService', () => {
  let analytics: { track: ReturnType<typeof vi.fn> };
  let onlineRoom: {
    createRoom: ReturnType<typeof vi.fn>;
    joinRoom: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let service: OnlineLobbyRoomNavigationService;

  beforeEach(() => {
    analytics = {
      track: vi.fn(),
    };
    onlineRoom = {
      createRoom: vi.fn(() =>
        of({
          roomId: 'ROOM42',
        }),
      ),
      joinRoom: vi.fn(() => of(void 0)),
    };
    router = {
      navigate: vi.fn(() => Promise.resolve(true)),
    };

    TestBed.configureTestingModule({
      providers: [
        OnlineLobbyRoomNavigationService,
        { provide: GoAnalyticsService, useValue: analytics },
        { provide: OnlineRoomService, useValue: onlineRoom },
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(OnlineLobbyRoomNavigationService);
  });

  it('creates a room and navigates to the room detail page', () => {
    service.createRoom('Captain', 'go', 19);

    expect(onlineRoom.createRoom).toHaveBeenCalledWith('Captain', 'go', 19);
    expect(router.navigate).toHaveBeenCalledWith(['/online/room', 'ROOM42']);
  });

  it('creates a Go room with hosted rule options when supplied', () => {
    const timeControl = {
      type: 'byo-yomi' as const,
      mainTimeMs: 1_800_000,
      periodTimeMs: 30_000,
      periods: 3,
    };

    service.createRoom('Captain', 'go', 19, timeControl, {
      koRule: 'positional-superko',
      scoringRule: 'japanese-territory',
    });

    expect(onlineRoom.createRoom).toHaveBeenCalledWith(
      'Captain',
      'go',
      19,
      timeControl,
      {
        koRule: 'positional-superko',
        scoringRule: 'japanese-territory',
      },
    );
  });

  it('swallows create-room failures without navigating', () => {
    onlineRoom.createRoom.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );

    service.createRoom('Captain', 'go', 19);

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('tracks and joins lobby rooms before navigating to the room detail page', () => {
    const room = createRoomSummary();

    service.joinRoom(room, 'Guest');

    expect(analytics.track).toHaveBeenCalledWith({
      event: 'select_content',
      content_type: 'online_room',
      content_id: 'room_join',
      room_status: 'live',
    });
    expect(onlineRoom.joinRoom).toHaveBeenCalledWith(
      'ROOM42',
      'Guest',
      'lobby',
    );
    expect(router.navigate).toHaveBeenCalledWith(['/online/room', 'ROOM42']);
  });

  it('swallows join-room failures after tracking the join intent', () => {
    const room = createRoomSummary();
    onlineRoom.joinRoom.mockReturnValueOnce(
      throwError(() => new Error('closed')),
    );

    service.joinRoom(room, 'Guest');

    expect(analytics.track).toHaveBeenCalledWith(
      expect.objectContaining({
        content_id: 'room_join',
      }),
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('tracks room-open analytics without joining', () => {
    service.trackRoomOpen(createRoomSummary());

    expect(analytics.track).toHaveBeenCalledWith({
      event: 'select_content',
      content_type: 'online_room',
      content_id: 'room_open',
      room_status: 'live',
    });
    expect(onlineRoom.joinRoom).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

function createRoomSummary(): LobbyRoomSummary {
  return {
    roomId: 'ROOM42',
    status: 'live',
  } as LobbyRoomSummary;
}
