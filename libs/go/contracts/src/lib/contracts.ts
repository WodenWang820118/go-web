import {
  BoardPoint,
  GoMessageDescriptor,
  MatchSettings,
  MatchState,
  MoveCommand,
  PlayerColor,
} from '@gx/go/domain';

// #region Snapshot models
export interface ParticipantSummary {
  participantId: string;
  displayName: string;
  seat: PlayerColor | null;
  isHost: boolean;
  online: boolean;
  muted: boolean;
  joinedAt: string;
}

export interface SeatState {
  black: string | null;
  white: string | null;
}

export interface ChatMessage {
  id: string;
  participantId: string | null;
  displayName: string;
  message: string;
  sentAt: string;
  system: boolean;
}

export interface SystemNotice {
  id: string;
  message: GoMessageDescriptor;
  createdAt: string;
}

export interface HostedMatchSnapshot {
  settings: MatchSettings;
  state: MatchState;
  startedAt: string;
}

export type RematchResponseState = 'pending' | 'accepted' | 'declined';

export interface HostedRematchState {
  participants: Record<PlayerColor, string>;
  responses: Record<PlayerColor, RematchResponseState>;
}

export type LobbyRoomStatus = 'live' | 'ready' | 'waiting';

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
// #endregion

// #region REST DTOs
export interface CreateRoomRequest {
  displayName: string;
}

export interface JoinRoomRequest {
  displayName: string;
  participantToken?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  participantToken: string;
  participantId: string;
  snapshot: RoomSnapshot;
}

export interface JoinRoomResponse {
  roomId: string;
  participantToken: string;
  participantId: string;
  resumed: boolean;
  snapshot: RoomSnapshot;
}

export interface GetRoomResponse {
  snapshot: RoomSnapshot;
}

export interface ListRoomsResponse {
  rooms: LobbyRoomSummary[];
}
// #endregion

// #region Socket payloads
export interface RoomJoinPayload {
  roomId: string;
  participantToken: string;
}

export interface SeatClaimPayload {
  roomId: string;
  participantToken: string;
  color: PlayerColor;
}

export interface SeatReleasePayload {
  roomId: string;
  participantToken: string;
}

export interface GameStartSettings {
  mode: MatchSettings['mode'];
  boardSize: MatchSettings['boardSize'];
  komi?: number;
}

export interface GameStartPayload {
  roomId: string;
  participantToken: string;
  settings: GameStartSettings;
}

export interface RoomSettingsUpdatePayload {
  roomId: string;
  participantToken: string;
  settings: GameStartSettings;
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

export interface GameCommandPayload {
  roomId: string;
  participantToken: string;
  command: GameCommand;
}

export interface GameRematchResponsePayload {
  roomId: string;
  participantToken: string;
  accepted: boolean;
}

export interface ChatSendPayload {
  roomId: string;
  participantToken: string;
  message: string;
}

export interface HostModerationPayload {
  roomId: string;
  participantToken: string;
  targetParticipantId: string;
}
// #endregion

// #region Socket events
export interface RoomPresenceEvent {
  roomId: string;
  participants: ParticipantSummary[];
  seatState: SeatState;
}

export interface GameUpdatedEvent {
  roomId: string;
  match: HostedMatchSnapshot | null;
}

export interface ChatMessageEvent {
  roomId: string;
  message: ChatMessage;
}

export interface SystemNoticeEvent {
  roomId: string;
  notice: SystemNotice;
}

export interface CommandErrorEvent {
  code: string;
  message: GoMessageDescriptor;
}
// #endregion

// #region Helpers
export interface LocalizedErrorResponse {
  message: GoMessageDescriptor | GoMessageDescriptor[];
}

export function cloneRoomSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return structuredClone(snapshot);
}
// #endregion
