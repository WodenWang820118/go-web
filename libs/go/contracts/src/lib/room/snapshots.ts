import {
  BoardPoint,
  GoMessageDescriptor,
  MatchSettings,
  MatchState,
  MoveCommand,
  PlayerColor,
} from '@gx/go/domain';

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
 * Full snapshot of a hosted room.
 */
export interface RoomSnapshot {
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
  chat: ChatMessage[];
}

/**
 * Settings used to start or stage the next hosted match.
 */
export interface GameStartSettings {
  mode: MatchSettings['mode'];
  boardSize: MatchSettings['boardSize'];
  komi?: number;
}

export type GameCommand =
  | MoveCommand
  | {
      type: 'toggle-dead';
      point: BoardPoint;
    }
  | {
      type: 'finalize-scoring';
    };
