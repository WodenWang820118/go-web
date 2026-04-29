import {
  BoardPoint,
  GameOpeningRule,
  GoMessageDescriptor,
  GameRuleset,
  MatchSettings,
  MatchState,
  MoveCommand,
  PlayerColor,
  TimeControlPlayerClockState,
  TimeControlSettings,
} from '@gx/go/domain';

export const ROOM_SNAPSHOT_SCHEMA_VERSION = 3;

export type RoomSnapshotSchemaVersion = typeof ROOM_SNAPSHOT_SCHEMA_VERSION;

/**
 * Public participant summary exposed to clients.
 */
export interface ParticipantSummary {
  participantId: string;
  displayName: string;
  seat: PlayerColor | null;
  isHost: boolean;
  online: boolean;
  muted: boolean;
  joinedAt: string;
}

/**
 * Current room seat ownership.
 */
export interface SeatState {
  black: string | null;
  white: string | null;
}

/**
 * Chat message snapshot stored in a hosted room.
 */
export interface ChatMessage {
  id: string;
  participantId: string | null;
  displayName: string;
  message: string;
  sentAt: string;
  system: boolean;
}

/**
 * Localized system notice shown to room participants.
 */
export interface SystemNotice {
  id: string;
  message: GoMessageDescriptor;
  createdAt: string;
}

/**
 * Snapshot of an active hosted match.
 */
export interface HostedMatchSnapshot {
  settings: MatchSettings;
  state: MatchState;
  startedAt: string;
  clock?: HostedClockSnapshot | null;
}

export type HostedClockPlayerSnapshot = TimeControlPlayerClockState;

export interface HostedClockSnapshot {
  config: TimeControlSettings;
  activeColor: PlayerColor;
  lastStartedAt: string;
  revision: number;
  players: Record<PlayerColor, HostedClockPlayerSnapshot>;
}

export type NigiriGuess = 'odd' | 'even';

export interface HostedNigiriPendingSnapshot {
  status: 'pending';
  commitment: string;
  guesser: PlayerColor;
}

export interface HostedNigiriResolvedSnapshot {
  status: 'resolved';
  commitment: string;
  guesser: PlayerColor;
  guess: NigiriGuess;
  parity: NigiriGuess;
  nonce: string;
  assignedBlack: PlayerColor;
}

export type HostedNigiriSnapshot =
  | HostedNigiriPendingSnapshot
  | HostedNigiriResolvedSnapshot;

export interface HostedRulesMetadata {
  ruleset: GameRuleset;
  openingRule: GameOpeningRule;
  timeControl: TimeControlSettings | null;
}

export type RematchResponseState = 'pending' | 'accepted' | 'declined';

/**
 * Rematch participants and their latest responses.
 */
export interface HostedRematchState {
  participants: Record<PlayerColor, string>;
  responses: Record<PlayerColor, RematchResponseState>;
}

export type LobbyRoomStatus = 'live' | 'ready' | 'waiting';
export type LobbyOnlineParticipantActivity = 'playing' | 'seated' | 'watching';

/**
 * Public summary shown in the hosted-room lobby.
 */
export interface LobbyRoomSummary {
  roomId: string;
  createdAt: string;
  updatedAt: string;
  hostDisplayName: string;
  status: LobbyRoomStatus;
  mode: MatchSettings['mode'] | null;
  boardSize: MatchSettings['boardSize'] | null;
  players: {
    black: string | null;
    white: string | null;
  };
  participantCount: number;
  onlineCount: number;
  spectatorCount: number;
}

/**
 * Online participant summary shown in the hosted-room lobby sidebar.
 */
export interface LobbyOnlineParticipantSummary {
  participantId: string;
  displayName: string;
  roomId: string;
  seat: PlayerColor | null;
  isHost: boolean;
  joinedAt: string;
  activity: LobbyOnlineParticipantActivity;
}

/**
 * Full snapshot of a hosted room.
 */
export interface RoomSnapshot {
  schemaVersion?: RoomSnapshotSchemaVersion;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  hostParticipantId: string;
  participants: ParticipantSummary[];
  seatState: SeatState;
  nextMatchSettings: GameStartSettings;
  rematch: HostedRematchState | null;
  autoStartBlockedUntilSeatChange: boolean;
  match: HostedMatchSnapshot | null;
  nigiri?: HostedNigiriSnapshot | null;
  rules?: HostedRulesMetadata | null;
  chat: ChatMessage[];
}

/**
 * Settings used to start or stage the next hosted match.
 */
export interface GameStartSettings {
  mode: MatchSettings['mode'];
  boardSize: MatchSettings['boardSize'];
  komi?: number;
  ruleset?: GameRuleset;
  openingRule?: GameOpeningRule;
  timeControl?: TimeControlSettings | null;
}

export type GameCommand =
  | MoveCommand
  | {
      type: 'toggle-dead';
      point: BoardPoint;
    }
  | {
      type: 'finalize-scoring';
    }
  | {
      type: 'confirm-scoring';
    }
  | {
      type: 'dispute-scoring';
    }
  | {
      type: 'nigiri-guess';
      guess: NigiriGuess;
    };
