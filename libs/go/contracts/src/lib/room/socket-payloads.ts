import { PlayerColor } from '@gx/go/domain';
import { GameCommand, GameStartSettings } from './snapshots';

/**
 * Initial socket payload used to join room realtime.
 */
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
