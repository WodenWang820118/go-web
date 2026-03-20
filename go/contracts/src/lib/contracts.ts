import {
  BoardPoint,
  MatchSettings,
  MatchState,
  MoveCommand,
  PlayerColor,
} from '@org/go/domain';

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
  message: string;
  createdAt: string;
}

export interface HostedMatchSnapshot {
  settings: MatchSettings;
  state: MatchState;
  startedAt: string;
}

export interface RoomSnapshot {
  roomId: string;
  createdAt: string;
  updatedAt: string;
  hostParticipantId: string;
  participants: ParticipantSummary[];
  seatState: SeatState;
  match: HostedMatchSnapshot | null;
  chat: ChatMessage[];
}

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
  message: string;
}

export function cloneRoomSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return structuredClone(snapshot);
}
