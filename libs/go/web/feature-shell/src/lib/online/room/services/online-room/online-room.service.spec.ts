import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { RoomSnapshot } from '@gx/go/contracts';
import { DEFAULT_GO_TIME_CONTROL, createMessage } from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { GO_SERVER_ORIGIN } from '@gx/go/state/server-origin';
import { vi } from 'vitest';
import { OnlineRoomService } from './online-room.service';
import {
  OnlineRoomStorageService,
  StoredRoomIdentity,
} from '../online-room-storage/online-room-storage.service';

class MockSocket {
  readonly emitted: Array<{ event: string; payload?: unknown }> = [];
  private readonly handlers = new Map<
    string,
    Array<(payload?: unknown) => void>
  >();
  connected = false;

  on(event: string, handler: (payload?: unknown) => void): this {
    const current = this.handlers.get(event) ?? [];
    current.push(handler);
    this.handlers.set(event, current);
    return this;
  }

  emit(event: string, payload?: unknown): void {
    this.emitted.push({ event, payload });
  }

  connect(): void {
    this.connected = true;
    this.trigger('connect');
  }

  disconnect(): void {
    this.connected = false;
    this.trigger('disconnect');
  }

  removeAllListeners(): void {
    this.handlers.clear();
  }

  trigger(event: string, payload?: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(payload);
    }
  }
}

let socket: MockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socket),
}));

describe('OnlineRoomService', () => {
  let service: OnlineRoomService;
  let httpMock: HttpTestingController;
  let storage: OnlineRoomStorageService;
  let analytics: {
    track: ReturnType<typeof vi.fn>;
    trackOnce: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    socket = new MockSocket();
    analytics = {
      track: vi.fn(),
      trackOnce: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OnlineRoomService,
        OnlineRoomStorageService,
        {
          provide: GO_SERVER_ORIGIN,
          useValue: '',
        },
        {
          provide: GoAnalyticsService,
          useValue: analytics,
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(OnlineRoomService);
    httpMock = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(OnlineRoomStorageService);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('restores a saved identity and rejoins over websocket during bootstrap', () => {
    const stored: StoredRoomIdentity = {
      displayName: 'Host',
      participantId: 'host-1',
      participantToken: 'token-1',
    };
    storage.set('ROOM42', stored);

    service.bootstrapRoom('room42');

    httpMock.expectOne('/api/rooms/ROOM42').flush({
      snapshot: createSnapshot('ROOM42'),
    });
    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    expect(joinRequest.request.body.participantToken).toBe('token-1');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'host-1',
      participantToken: 'token-1',
      resumed: true,
      snapshot: createSnapshot('ROOM42'),
    });

    expect(service.participantId()).toBe('host-1');
    expect(service.connectionState()).toBe('connected');
    expect(socket.emitted).toContainEqual({
      event: 'room.join',
      payload: {
        roomId: 'ROOM42',
        participantToken: 'token-1',
      },
    });
  });

  it('tracks hosted room interactions without message or identity payloads', () => {
    service.claimSeat('black');
    service.releaseSeat();
    service.sendChat('hello secret table');
    service.respondToRematch(true);
    service.respondToRematch(false);

    expect(analytics.track.mock.calls.map((call) => call[0])).toEqual([
      {
        event: 'gx_room_interaction',
        game_mode: undefined,
        interaction_type: 'seat_claim',
        play_context: 'hosted',
      },
      {
        event: 'gx_room_interaction',
        game_mode: undefined,
        interaction_type: 'seat_release',
        play_context: 'hosted',
      },
      {
        event: 'gx_room_interaction',
        game_mode: undefined,
        interaction_type: 'chat_send',
        play_context: 'hosted',
      },
      {
        event: 'gx_room_interaction',
        game_mode: undefined,
        interaction_type: 'rematch_accept',
        play_context: 'hosted',
      },
      {
        event: 'gx_room_interaction',
        game_mode: undefined,
        interaction_type: 'rematch_decline',
        play_context: 'hosted',
      },
    ]);
  });

  it('applies presence updates pushed from the websocket', () => {
    service.joinRoom('ROOM42', 'Guest').subscribe();

    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'guest-1',
      participantToken: 'token-2',
      resumed: false,
      snapshot: createSnapshot('ROOM42'),
    });

    socket.trigger('room.presence', {
      roomId: 'ROOM42',
      participants: [
        {
          participantId: 'guest-1',
          displayName: 'Guest',
          seat: 'black',
          isHost: false,
          online: true,
          muted: false,
          joinedAt: '2026-03-20T00:00:00.000Z',
        },
      ],
      seatState: {
        black: 'guest-1',
        white: null,
      },
    });

    expect(service.viewerSeat()).toBe('black');
    expect(service.snapshot()?.seatState.black).toBe('guest-1');
  });

  it('marks the room as missing when bootstrap receives a 404', () => {
    service.bootstrapRoom('room42');

    const request = httpMock.expectOne('/api/rooms/ROOM42');
    request.flush({}, { status: 404, statusText: 'Not Found' });

    expect(service.bootstrapState()).toBe('missing');
    expect(service.snapshot()).toBeNull();
  });

  it('stores the created-room identity and connects realtime after room creation', () => {
    let createdRoomId = '';

    service
      .createRoom('Host', 'go', 13, DEFAULT_GO_TIME_CONTROL)
      .subscribe((response) => {
        createdRoomId = response.roomId;
      });

    const request = httpMock.expectOne('/api/rooms');
    expect(request.request.body).toEqual({
      displayName: 'Host',
      mode: 'go',
      boardSize: 13,
      timeControl: DEFAULT_GO_TIME_CONTROL,
    });
    request.flush({
      roomId: 'ROOM42',
      participantId: 'host-1',
      participantToken: 'token-1',
      snapshot: createSnapshot('ROOM42'),
    });

    expect(createdRoomId).toBe('ROOM42');
    expect(service.displayName()).toBe('Host');
    expect(storage.get('ROOM42')).toEqual({
      displayName: 'Host',
      participantId: 'host-1',
      participantToken: 'token-1',
    });
    expect(service.connectionState()).toBe('connected');
    expect(socket.emitted).toContainEqual({
      event: 'room.join',
      payload: {
        roomId: 'ROOM42',
        participantToken: 'token-1',
      },
    });
  });

  it('surfaces a realtime error when commands are attempted while disconnected', () => {
    const i18n = TestBed.inject(GoI18nService);

    service.joinRoom('ROOM42', 'Guest').subscribe();

    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'guest-1',
      participantToken: 'token-2',
      resumed: false,
      snapshot: createSnapshot('ROOM42'),
    });

    socket.disconnect();
    service.claimSeat('black');

    expect(service.connectionState()).toBe('disconnected');
    expect(service.lastError()).toBe(
      i18n.t('room.client.realtime_unavailable'),
    );
    expect(socket.emitted.some((event) => event.event === 'seat.claim')).toBe(
      false,
    );
  });

  it('requires joining the room before sending realtime actions', () => {
    const i18n = TestBed.inject(GoI18nService);

    service.claimSeat('black');

    expect(service.lastError()).toBe(i18n.t('room.client.join_required'));
    expect(socket.emitted).toEqual([]);
  });

  it('emits settings updates and rematch responses over realtime once joined', () => {
    service.joinRoom('ROOM42', 'Guest').subscribe();

    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'guest-1',
      participantToken: 'token-2',
      resumed: false,
      snapshot: createSnapshot('ROOM42'),
    });

    service.updateNextMatchSettings({
      mode: 'gomoku',
      boardSize: 15,
    });
    service.respondToRematch(true);

    expect(socket.emitted).toContainEqual({
      event: 'room.settings.update',
      payload: {
        roomId: 'ROOM42',
        participantToken: 'token-2',
        settings: {
          mode: 'gomoku',
          boardSize: 15,
        },
      },
    });
    expect(socket.emitted).toContainEqual({
      event: 'game.rematch.respond',
      payload: {
        roomId: 'ROOM42',
        participantToken: 'token-2',
        accepted: true,
      },
    });
  });

  it('applies snapshot, game, chat, notice, and command error socket events', () => {
    const i18n = TestBed.inject(GoI18nService);

    service.joinRoom('ROOM42', 'Guest').subscribe();

    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'guest-1',
      participantToken: 'token-2',
      resumed: false,
      snapshot: createSnapshot('ROOM42'),
    });

    const liveSnapshot = createSnapshot('ROOM42');
    liveSnapshot.chat.push({
      id: 'chat-0',
      participantId: 'host-1',
      displayName: 'Host',
      message: 'Welcome',
      sentAt: '2026-03-20T00:02:00.000Z',
      system: false,
    });
    socket.trigger('room.snapshot', liveSnapshot);
    socket.trigger('game.updated', {
      roomId: 'ROOM42',
      match: {
        settings: {
          mode: 'go',
          boardSize: 19,
          players: {
            black: 'Guest',
            white: 'Host',
          },
          komi: 6.5,
        },
        state: {
          mode: 'go',
          phase: 'playing',
          boardSize: 19,
          board: Array.from({ length: 19 }, () => Array(19).fill(null)),
          nextPlayer: 'black',
          captures: {
            black: 0,
            white: 0,
          },
          moveHistory: [],
          message: createMessage('game.state.next_turn', {
            player: createMessage('common.player.black'),
          }),
        },
        startedAt: '2026-03-20T00:05:00.000Z',
      },
    });
    socket.trigger('chat.message', {
      roomId: 'ROOM42',
      message: {
        id: 'chat-1',
        participantId: 'guest-1',
        displayName: 'Guest',
        message: 'Hello',
        sentAt: '2026-03-20T00:03:00.000Z',
        system: false,
      },
    });
    socket.trigger('system.notice', {
      roomId: 'ROOM42',
      notice: {
        id: 'notice-1',
        message: createMessage('room.notice.seat_claimed', {
          displayName: 'Guest',
          seat: createMessage('common.seat.black'),
        }),
        createdAt: '2026-03-20T00:04:00.000Z',
      },
    });
    socket.trigger('command.error', {
      code: 'invalid-move',
      message: createMessage('room.error.not_your_turn'),
    });

    expect(service.snapshot()?.chat).toHaveLength(2);
    expect(service.match()?.state.phase).toBe('playing');
    expect(service.lastNotice()).toBe(
      i18n.t('room.notice.seat_claimed', {
        displayName: 'Guest',
        seat: i18n.t('common.seat.black'),
      }),
    );
    expect(service.lastSystemNotice()?.message.key).toBe(
      'room.notice.seat_claimed',
    );
    expect(service.lastError()).toBe(i18n.t('room.error.not_your_turn'));
  });

  it('posts a host close request and clears the active room identity on success', () => {
    service.joinRoom('ROOM42', 'Host').subscribe();

    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'host-1',
      participantToken: 'token-1',
      resumed: false,
      snapshot: createSnapshot('ROOM42'),
    });

    service.closeRoom().subscribe();

    const closeRequest = httpMock.expectOne('/api/rooms/ROOM42/close');
    expect(closeRequest.request.body).toEqual({
      participantToken: 'token-1',
    });
    closeRequest.flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    expect(storage.get('ROOM42')).toBeNull();
    expect(service.snapshot()).toBeNull();
    expect(service.participantId()).toBeNull();
    expect(service.participantToken()).toBeNull();
    expect(service.connectionState()).toBe('idle');
  });

  it('clears local room identity and exposes a closure event when the host closes the room remotely', () => {
    service.joinRoom('ROOM42', 'Guest').subscribe();

    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'guest-1',
      participantToken: 'token-2',
      resumed: false,
      snapshot: createSnapshot('ROOM42'),
    });

    socket.trigger('room.closed', {
      roomId: 'ROOM42',
      message: createMessage('room.notice.closed_by_host'),
    });

    expect(storage.get('ROOM42')).toBeNull();
    expect(service.connectionState()).toBe('idle');
    expect(service.roomClosed()?.roomId).toBe('ROOM42');

    service.clearRoomClosedEvent();

    expect(service.roomClosed()).toBeNull();
  });

  it('uses a keepalive fetch request when the host unloads the page', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);

    service.joinRoom('ROOM42', 'Host').subscribe();

    const joinRequest = httpMock.expectOne('/api/rooms/ROOM42/join');
    joinRequest.flush({
      roomId: 'ROOM42',
      participantId: 'host-1',
      participantToken: 'token-1',
      resumed: false,
      snapshot: createSnapshot('ROOM42'),
    });

    await service.closeRoomWithKeepalive();

    expect(fetchSpy).toHaveBeenCalledWith('/api/rooms/ROOM42/close', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantToken: 'token-1',
      }),
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
