import { GoMessageDescriptor } from '@gx/go/domain';
import {
  ChatMessage,
  HostedMatchSnapshot,
  ParticipantSummary,
  SeatState,
  SystemNotice,
} from './snapshots';

/**
 * Realtime presence update broadcast to room clients.
 */
export interface RoomPresenceEvent {
  roomId: string;
  participants: ParticipantSummary[];
  seatState: SeatState;
}

/**
 * Realtime hosted-match update broadcast to room clients.
 */
export interface GameUpdatedEvent {
  roomId: string;
  match: HostedMatchSnapshot | null;
}

/**
 * Realtime chat message broadcast to room clients.
 */
export interface ChatMessageEvent {
  roomId: string;
  message: ChatMessage;
}

/**
 * Realtime system notice broadcast to room clients.
 */
export interface SystemNoticeEvent {
  roomId: string;
  notice: SystemNotice;
}

/**
 * Realtime command error broadcast to the requesting client.
 */
export interface CommandErrorEvent {
  code: string;
  message: GoMessageDescriptor;
}
