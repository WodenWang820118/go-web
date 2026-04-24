import { BoardSize, GameMode, GoMessageDescriptor } from '@gx/go/domain';
import {
  LobbyOnlineParticipantSummary,
  LobbyRoomSummary,
  RoomSnapshot,
} from './snapshots';

/**
 * Request body for creating a hosted room.
 */
export interface CreateRoomRequest {
  displayName: string;
  mode: GameMode;
  boardSize: BoardSize;
}

/**
 * Request body for joining a hosted room.
 */
export interface JoinRoomRequest {
  displayName: string;
  participantToken?: string;
}

/**
 * Request body for closing a hosted room.
 */
export interface CloseRoomRequest {
  participantToken: string;
}

/**
 * Response returned after creating a hosted room.
 */
export interface CreateRoomResponse {
  roomId: string;
  participantToken: string;
  participantId: string;
  snapshot: RoomSnapshot;
}

/**
 * Response returned after joining an existing hosted room.
 */
export interface JoinRoomResponse {
  roomId: string;
  participantToken: string;
  participantId: string;
  resumed: boolean;
  snapshot: RoomSnapshot;
}

/**
 * Response body for retrieving a single hosted room.
 */
export interface GetRoomResponse {
  snapshot: RoomSnapshot;
}

/**
 * Response body for the public hosted-room lobby.
 */
export interface ListRoomsResponse {
  rooms: LobbyRoomSummary[];
  onlineParticipants: LobbyOnlineParticipantSummary[];
}

/**
 * Localized error payload shared by room endpoints.
 */
export interface LocalizedErrorResponse {
  message: GoMessageDescriptor | GoMessageDescriptor[];
}
