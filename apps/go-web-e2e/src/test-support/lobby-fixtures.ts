import type { LobbyRoomSummary } from '@gx/go/contracts';
import {
  createLobbyOnlineParticipant,
  createLobbyRoomSummary,
  createParticipantSummary,
  createRoomSnapshot,
} from '@gx/go/contracts/testing';
import type { Page } from '@playwright/test';

type LobbyRoomOverrides = Partial<{
  boardSize: number | null;
  mode: 'go' | 'gomoku' | null;
  onlineCount: number;
  participantCount: number;
  players: {
    black: string | null;
    white: string | null;
  };
  spectatorCount: number;
}>;

export type LobbyRoomFixture = LobbyRoomSummary;

const SCROLLABLE_LIVE_ROOM_COUNT = 12;
const READY_ROOM_COUNT = 6;
const WAITING_ROOM_COUNT = 6;

/**
 * Creates a hosted-lobby room fixture tuned for Playwright route mocks.
 */
export function createLobbyRoom(
  roomId: string,
  status: 'live' | 'ready' | 'waiting',
  hostDisplayName: string,
  overrides: LobbyRoomOverrides = {},
): LobbyRoomFixture {
  return createLobbyRoomSummary({
    roomId,
    hostDisplayName,
    status,
    mode: overrides.mode ?? 'go',
    boardSize: overrides.boardSize ?? 19,
    players: overrides.players ?? {
      black: hostDisplayName,
      white: 'Guest',
    },
    participantCount: overrides.participantCount ?? 2,
    onlineCount: overrides.onlineCount ?? 2,
    spectatorCount: overrides.spectatorCount ?? 0,
  });
}

/**
 * Creates a dense mix of live, ready, and waiting rooms for responsive lobby tests.
 * The live-room count intentionally guarantees that desktop/tablet room tables
 * overflow and exercise the sticky-header scroll path across browsers.
 */
export function createDenseLobbyRooms(): LobbyRoomFixture[] {
  return [
    ...Array.from({ length: SCROLLABLE_LIVE_ROOM_COUNT }, (_, index) =>
      createLobbyRoom(
        `LIVE${String(index + 1).padStart(2, '0')}`,
        'live',
        `Live Host ${String(index + 1).padStart(2, '0')}`,
        {
          mode: index % 2 === 0 ? 'go' : 'gomoku',
          boardSize: index % 2 === 0 ? 19 : 15,
          players: {
            black: `Live Black ${index + 1}`,
            white: `Live White ${index + 1}`,
          },
          participantCount: 2,
          onlineCount: 2,
          spectatorCount: 3 + index,
        },
      ),
    ),
    ...Array.from({ length: READY_ROOM_COUNT }, (_, index) =>
      createLobbyRoom(
        `READY${String(index + 1).padStart(2, '0')}`,
        'ready',
        `Ready Host ${String(index + 1).padStart(2, '0')}`,
        {
          mode: 'go',
          boardSize: 19,
          players: {
            black: `Ready Host ${String(index + 1).padStart(2, '0')}`,
            white: `Ready Guest ${index + 1}`,
          },
          participantCount: 2,
          onlineCount: 2,
          spectatorCount: index,
        },
      ),
    ),
    ...Array.from({ length: WAITING_ROOM_COUNT }, (_, index) =>
      createLobbyRoom(
        `WAIT${String(index + 1).padStart(2, '0')}`,
        'waiting',
        `Waiting Host ${String(index + 1).padStart(2, '0')}`,
        {
          mode: index % 2 === 0 ? null : 'gomoku',
          boardSize: index % 2 === 0 ? null : 15,
          players: {
            black:
              index % 2 === 0
                ? null
                : `Waiting Host ${String(index + 1).padStart(2, '0')}`,
            white: null,
          },
          participantCount: index % 2 === 0 ? 1 : 2,
          onlineCount: 1,
          spectatorCount: 1,
        },
      ),
    ),
  ];
}

/**
 * Mocks the hosted-lobby REST contract plus room bootstrap responses for lobby flows.
 */
export async function mockLobby(
  page: Page,
  rooms: LobbyRoomFixture[],
): Promise<void> {
  const onlineParticipants = createLobbyOnlineParticipants(rooms);
  const snapshots = new Map(
    rooms.map((room) => [room.roomId, createLobbySnapshot(room)]),
  );

  await page.route('**/api/rooms**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() === 'GET' && pathname === '/api/rooms') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rooms,
          onlineParticipants,
        }),
      });
      return;
    }

    const roomMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)$/);
    if (request.method() === 'GET' && roomMatch?.[1]) {
      const roomId = roomMatch[1];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          snapshot:
            snapshots.get(roomId) ?? createLobbySnapshotFallback(roomId),
        }),
      });
      return;
    }

    const joinMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/join$/);
    if (request.method() === 'POST' && joinMatch?.[1]) {
      const roomId = joinMatch[1];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          roomId,
          participantId: 'guest-1',
          participantToken: 'token-1',
          resumed: false,
          snapshot:
            snapshots.get(roomId) ?? createLobbySnapshotFallback(roomId),
        }),
      });
      return;
    }

    await route.continue();
  });
}

function createLobbySnapshot(room: LobbyRoomFixture) {
  return createRoomSnapshot({
    roomId: room.roomId,
    participants: [
      createParticipantSummary({
        participantId: 'host-1',
        displayName: room.hostDisplayName,
      }),
    ],
  });
}

function createLobbySnapshotFallback(roomId: string) {
  return createRoomSnapshot({
    roomId,
    participants: [
      createParticipantSummary({
        participantId: 'host-1',
        displayName: `Host ${roomId}`,
      }),
    ],
  });
}

function createLobbyOnlineParticipants(rooms: LobbyRoomFixture[]) {
  return rooms.slice(0, 10).flatMap((room) => {
    if (room.status === 'live') {
      return [
        createLobbyOnlineParticipant({
          participantId: `${room.roomId}-black`,
          displayName: room.players.black ?? `${room.hostDisplayName} Black`,
          roomId: room.roomId,
          seat: 'black',
          isHost: true,
          activity: 'playing',
        }),
        createLobbyOnlineParticipant({
          participantId: `${room.roomId}-white`,
          displayName: room.players.white ?? 'Guest',
          roomId: room.roomId,
          seat: 'white',
          isHost: false,
          joinedAt: '2026-03-20T00:01:00.000Z',
          activity: 'playing',
        }),
      ];
    }

    if (room.status === 'ready' && room.players.black && room.players.white) {
      return [
        createLobbyOnlineParticipant({
          participantId: `${room.roomId}-black`,
          displayName: room.players.black,
          roomId: room.roomId,
          seat: 'black',
          isHost: true,
          activity: 'seated',
        }),
        createLobbyOnlineParticipant({
          participantId: `${room.roomId}-white`,
          displayName: room.players.white,
          roomId: room.roomId,
          seat: 'white',
          isHost: false,
          joinedAt: '2026-03-20T00:01:00.000Z',
          activity: 'seated',
        }),
      ];
    }

    return [
      createLobbyOnlineParticipant({
        participantId: `${room.roomId}-watcher`,
        displayName: room.hostDisplayName,
        roomId: room.roomId,
        seat: null,
        isHost: true,
        activity: 'watching',
      }),
    ];
  });
}
