import { TestBed } from '@angular/core/testing';
import { RoomSnapshot } from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { OnlineRoomIdentityService } from '../online-room-identity/online-room-identity.service';
import { OnlineRoomSelectorsService } from '../online-room-selectors/online-room-selectors.service';
import { OnlineRoomSnapshotService } from '../online-room-snapshot/online-room-snapshot.service';
import { OnlineRoomSocketService } from '../online-room-socket/online-room-socket.service';
import { OnlineRoomStorageService } from '../online-room-storage/online-room-storage.service';
import { OnlineRoomsHttpService } from '../online-rooms-http/online-rooms-http.service';
import { OnlineRoomSessionStateService } from './online-room-session-state.service';
import { OnlineRoomSessionWorkflowService } from './online-room-session-workflow.service';

describe('OnlineRoomSessionWorkflowService', () => {
  let service: OnlineRoomSessionWorkflowService;
  let state: OnlineRoomSessionStateService;
  let analytics: { track: ReturnType<typeof vi.fn> };
  const storage = {
    clear: vi.fn(),
    get: vi.fn(() => null),
    set: vi.fn(),
  };
  const socket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  beforeEach(() => {
    storage.clear.mockClear();
    storage.get.mockClear();
    storage.set.mockClear();
    socket.connect.mockClear();
    socket.disconnect.mockClear();
    analytics = {
      track: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OnlineRoomSessionWorkflowService,
        OnlineRoomSessionStateService,
        OnlineRoomSelectorsService,
        OnlineRoomSnapshotService,
        {
          provide: OnlineRoomsHttpService,
          useValue: {
            closeRoom: vi.fn(),
            closeRoomUrl: vi.fn(
              (roomId: string) => `/api/rooms/${roomId}/close`,
            ),
            createRoom: vi.fn(),
            describeHttpError: vi.fn(() => 'network error'),
            getRoom: vi.fn(),
            joinRoom: vi.fn(),
          },
        },
        {
          provide: OnlineRoomIdentityService,
          useValue: {
            createStoredRoomIdentity: vi.fn(),
            normalizeRoomId: vi.fn((roomId: string) => roomId.toUpperCase()),
            resolveJoinDisplayName: vi.fn((displayName: string) => displayName),
            resolveResponseDisplayName: vi.fn(
              (displayName: string) => displayName,
            ),
          },
        },
        {
          provide: OnlineRoomStorageService,
          useValue: storage,
        },
        {
          provide: OnlineRoomSocketService,
          useValue: socket,
        },
        {
          provide: GoI18nService,
          useValue: {
            t: vi.fn((key: string) => key),
          },
        },
        {
          provide: GoAnalyticsService,
          useValue: analytics,
        },
      ],
    });

    service = TestBed.inject(OnlineRoomSessionWorkflowService);
    state = TestBed.inject(OnlineRoomSessionStateService);
  });

  it('clears the active room session and preserves the display name when the room closes', () => {
    state.applyJoinResponse('ROOM42', 'Host', {
      roomId: 'ROOM42',
      participantId: 'host-1',
      participantToken: 'token-1',
      snapshot: createSnapshot('ROOM42'),
    });

    service.markRoomClosed({
      roomId: 'ROOM42',
      message: createMessage('room.notice.closed_by_host'),
    });

    expect(storage.clear).toHaveBeenCalledWith('ROOM42');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(state.snapshot()).toBeNull();
    expect(state.participantId()).toBeNull();
    expect(state.participantToken()).toBeNull();
    expect(state.displayName()).toBe('Host');
    expect(state.roomClosed()?.roomId).toBe('ROOM42');
  });

  it('ignores room-closed events for a different active room', () => {
    state.applyJoinResponse('ROOM42', 'Host', {
      roomId: 'ROOM42',
      participantId: 'host-1',
      participantToken: 'token-1',
      snapshot: createSnapshot('ROOM42'),
    });

    service.markRoomClosed({
      roomId: 'ROOM99',
      message: createMessage('room.notice.closed_by_host'),
    });

    expect(storage.clear).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(state.snapshot()?.roomId).toBe('ROOM42');
    expect(state.roomClosed()).toBeNull();
  });

  it('tracks hosted room creation and match start without room identity data', () => {
    const api = TestBed.inject(OnlineRoomsHttpService);
    vi.mocked(api.createRoom).mockReturnValue(
      of({
        roomId: 'ROOM42',
        participantId: 'host-1',
        participantToken: 'token-1',
        snapshot: createSnapshot('ROOM42'),
      }),
    );

    service.createRoom('Host', 'go', 19).subscribe();

    expect(analytics.track).toHaveBeenCalledWith({
      board_size: 19,
      event: 'gx_room_create',
      game_mode: 'go',
    });
    expect(analytics.track).toHaveBeenCalledWith({
      board_size: 19,
      event: 'gx_match_start',
      game_mode: 'go',
      play_context: 'hosted',
      start_source: 'room_create',
    });
  });

  it('tracks hosted joins with the caller-supplied source only', () => {
    const api = TestBed.inject(OnlineRoomsHttpService);
    vi.mocked(api.joinRoom).mockReturnValue(
      of({
        roomId: 'ROOM42',
        participantId: 'guest-1',
        participantToken: 'token-2',
        resumed: false,
        snapshot: createSnapshot('ROOM42'),
      }),
    );

    service.joinRoom('room42', 'Guest', 'lobby').subscribe();

    expect(analytics.track).toHaveBeenCalledWith({
      event: 'gx_room_join',
      join_source: 'lobby',
    });
  });

  it('defaults hosted join tracking to the direct-room source', () => {
    const api = TestBed.inject(OnlineRoomsHttpService);
    vi.mocked(api.joinRoom).mockReturnValue(
      of({
        roomId: 'ROOM42',
        participantId: 'guest-1',
        participantToken: 'token-2',
        resumed: false,
        snapshot: createSnapshot('ROOM42'),
      }),
    );

    service.joinRoom('room42', 'Guest').subscribe();

    expect(analytics.track).toHaveBeenCalledWith({
      event: 'gx_room_join',
      join_source: 'direct_room',
    });
  });
});

function createSnapshot(roomId: string): RoomSnapshot {
  return {
    roomId,
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
  };
}
