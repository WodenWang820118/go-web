import { type RoomSnapshot, type SystemNotice } from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
import { type Mock, describe, expect, it, vi } from 'vitest';
import { RoomsRealtimeBroadcasterService } from './rooms-realtime-broadcaster.service';

function createRoomSnapshot(roomId = 'ROOM-1'): RoomSnapshot {
  return {
    roomId,
    createdAt: '2026-04-20T12:00:00.000Z',
    updatedAt: '2026-04-20T12:05:00.000Z',
    hostParticipantId: 'host-1',
    participants: [],
    seatState: {
      black: null,
      white: null,
    },
    nextMatchSettings: {
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
    },
    rematch: null,
    autoStartBlockedUntilSeatChange: false,
    match: null,
    chat: [],
  };
}

function createSystemNotice(): SystemNotice {
  return {
    id: 'notice-1',
    message: createMessage('room.error.not_found', {
      roomId: 'ROOM-1',
    }),
    createdAt: '2026-04-20T12:10:00.000Z',
  };
}

describe('RoomsRealtimeBroadcasterService', () => {
  it('broadcasts snapshot, presence, game state, notice, and disconnections from a mutation result', () => {
    const service = new RoomsRealtimeBroadcasterService();
    const emitted: Array<{
      room: string;
      event: string;
      payload: unknown;
    }> = [];
    const socketA = {
      disconnect: vi.fn(),
    };
    const socketB = {
      disconnect: vi.fn(),
    };
    const server = {
      to: vi.fn((room: string) => ({
        emit: vi.fn((event: string, payload: unknown) => {
          emitted.push({
            room,
            event,
            payload,
          });
        }),
      })),
      sockets: {
        sockets: new Map([
          ['socket-a', socketA],
          ['socket-b', socketB],
        ]),
      },
    };
    const snapshot = createRoomSnapshot();
    const notice = createSystemNotice();

    service.registerServer(server as never);
    service.broadcastMutationResult(
      {
        snapshot,
        notice,
      },
      {
        publishGameState: true,
        disconnectSocketIds: ['socket-a', 'socket-b'],
      },
    );

    expect(emitted).toEqual([
      {
        room: 'room:ROOM-1',
        event: 'room.snapshot',
        payload: snapshot,
      },
      {
        room: 'room:ROOM-1',
        event: 'room.presence',
        payload: {
          roomId: 'ROOM-1',
          participants: snapshot.participants,
          seatState: snapshot.seatState,
        },
      },
      {
        room: 'room:ROOM-1',
        event: 'game.updated',
        payload: {
          roomId: 'ROOM-1',
          match: snapshot.match,
        },
      },
      {
        room: 'room:ROOM-1',
        event: 'system.notice',
        payload: {
          roomId: 'ROOM-1',
          notice,
        },
      },
    ]);
    expect(socketA.disconnect).toHaveBeenCalledWith(true);
    expect(socketB.disconnect).toHaveBeenCalledWith(true);
  });

  it('emits chat messages to the room channel', () => {
    const service = new RoomsRealtimeBroadcasterService();
    const emit = vi.fn();
    const server = {
      to: vi.fn(() => ({
        emit,
      })),
      sockets: {
        sockets: new Map(),
      },
    };
    const message = {
      id: 'chat-1',
      participantId: 'host-1',
      displayName: 'Host',
      message: 'Hello',
      sentAt: '2026-04-20T12:15:00.000Z',
      system: false,
    };

    service.registerServer(server as never);
    service.broadcastChatMessage('ROOM-1', message);

    expect((server.to as Mock).mock.calls).toEqual([['room:ROOM-1']]);
    expect(emit).toHaveBeenCalledWith('chat.message', {
      roomId: 'ROOM-1',
      message,
    });
  });

  it('omits game.updated when publishGameState is disabled but still emits notices', () => {
    const service = new RoomsRealtimeBroadcasterService();
    const emitted: string[] = [];
    const server = {
      to: vi.fn(() => ({
        emit: vi.fn((event: string) => {
          emitted.push(event);
        }),
      })),
      sockets: {
        sockets: new Map(),
      },
    };

    service.registerServer(server as never);
    service.broadcastMutationResult({
      snapshot: createRoomSnapshot(),
      notice: createSystemNotice(),
    });

    expect(emitted).toEqual([
      'room.snapshot',
      'room.presence',
      'system.notice',
    ]);
  });

  it('can suppress presence broadcasts when a mutation should only refresh the snapshot', () => {
    const service = new RoomsRealtimeBroadcasterService();
    const emitted: string[] = [];
    const server = {
      to: vi.fn(() => ({
        emit: vi.fn((event: string) => {
          emitted.push(event);
        }),
      })),
      sockets: {
        sockets: new Map(),
      },
    };

    service.registerServer(server as never);
    service.broadcastMutationResult(
      {
        snapshot: createRoomSnapshot(),
      },
      {
        publishPresence: false,
      },
    );

    expect(emitted).toEqual(['room.snapshot']);
  });
});
