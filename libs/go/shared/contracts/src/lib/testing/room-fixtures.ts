import type {
  LobbyOnlineParticipantSummary,
  LobbyRoomSummary,
  ParticipantSummary,
  RoomSnapshot,
  SeatState,
} from '../room/snapshots';
import { ROOM_SNAPSHOT_SCHEMA_VERSION } from '../room/snapshots';

const DEFAULT_ROOM_ID = 'ROOM01';
const DEFAULT_TIMESTAMP = '2026-03-20T00:00:00.000Z';
const DEFAULT_GUEST_TIMESTAMP = '2026-03-20T00:01:00.000Z';

/**
 * Creates a public room participant fixture with sensible hosted-room defaults.
 * Override only the fields relevant to the test so specs read like scenarios.
 */
export function createParticipantSummary(
  overrides: Partial<ParticipantSummary> = {},
): ParticipantSummary {
  return {
    participantId: 'host-1',
    displayName: 'Host',
    seat: null,
    isHost: true,
    online: true,
    muted: false,
    joinedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

/**
 * Creates the common two-player seated hosted-room fixture used by many room tests.
 */
export function createSeatedParticipants(options?: {
  guest?: Partial<ParticipantSummary>;
  host?: Partial<ParticipantSummary>;
}): [ParticipantSummary, ParticipantSummary] {
  return [
    createParticipantSummary({
      participantId: 'host-1',
      displayName: 'Host',
      seat: 'black',
      isHost: true,
      ...options?.host,
    }),
    createParticipantSummary({
      participantId: 'guest-1',
      displayName: 'Guest',
      seat: 'white',
      isHost: false,
      joinedAt: DEFAULT_GUEST_TIMESTAMP,
      ...options?.guest,
    }),
  ];
}

/**
 * Creates a room seat-state fixture.
 */
export function createSeatState(overrides: Partial<SeatState> = {}): SeatState {
  return {
    black: null,
    white: null,
    ...overrides,
  };
}

/**
 * Creates a full hosted-room snapshot fixture with override-friendly defaults.
 */
export function createRoomSnapshot(
  overrides: Partial<RoomSnapshot> = {},
): RoomSnapshot {
  const participants = overrides.participants ?? [createParticipantSummary()];
  const hostParticipantId =
    overrides.hostParticipantId ??
    participants.find((participant) => participant.isHost)?.participantId ??
    'host-1';

  return {
    schemaVersion: ROOM_SNAPSHOT_SCHEMA_VERSION,
    roomId: DEFAULT_ROOM_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    hostParticipantId,
    participants,
    seatState: createSeatState(),
    nextMatchSettings: {
      mode: 'go',
      boardSize: 19,
      komi: 6.5,
    },
    rematch: null,
    autoStartBlockedUntilSeatChange: false,
    match: null,
    nigiri: null,
    rules: null,
    chat: [],
    ...overrides,
  };
}

/**
 * Creates a hosted-lobby room summary fixture.
 */
export function createLobbyRoomSummary(
  overrides: Partial<LobbyRoomSummary> = {},
): LobbyRoomSummary {
  return {
    roomId: DEFAULT_ROOM_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    hostDisplayName: 'Host',
    status: 'waiting',
    mode: null,
    boardSize: null,
    players: {
      black: null,
      white: null,
    },
    participantCount: 1,
    onlineCount: 1,
    spectatorCount: 1,
    ...overrides,
  };
}

/**
 * Creates a hosted-lobby online participant fixture.
 */
export function createLobbyOnlineParticipant(
  overrides: Partial<LobbyOnlineParticipantSummary> = {},
): LobbyOnlineParticipantSummary {
  return {
    participantId: 'participant-1',
    displayName: 'Host',
    roomId: DEFAULT_ROOM_ID,
    seat: null,
    isHost: true,
    joinedAt: DEFAULT_TIMESTAMP,
    activity: 'watching',
    ...overrides,
  };
}
