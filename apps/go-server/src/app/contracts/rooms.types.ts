import {
  ChatMessage,
  GameStartSettings,
  HostedMatchSnapshot,
  HostedRematchState,
  RoomClosedEvent,
  RoomSnapshot,
  SystemNotice,
} from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';

export interface ParticipantRecord {
  id: string;
  token: string;
  displayName: string;
  seat: PlayerColor | null;
  isHost: boolean;
  online: boolean;
  muted: boolean;
  joinedAt: string;
  socketIds: Set<string>;
  chatTimestamps: number[];
}

export interface RoomRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  hostParticipantId: string;
  participants: Map<string, ParticipantRecord>;
  tokenIndex: Map<string, string>;
  nextMatchSettings: GameStartSettings;
  rematch: HostedRematchState | null;
  autoStartBlockedUntilSeatChange: boolean;
  match: HostedMatchSnapshot | null;
  chat: ChatMessage[];
  emptySince: number | null;
}

export interface SocketIndexEntry {
  roomId: string;
  participantId: string;
}

export interface MutationResult {
  snapshot: RoomSnapshot;
  notice?: SystemNotice;
}

export interface ChatResult {
  snapshot: RoomSnapshot;
  message: ChatMessage;
}

export interface KickResult extends MutationResult {
  kickedSocketIds: string[];
}

export interface CloseRoomResult {
  roomId: string;
  event: RoomClosedEvent;
  socketIds: string[];
}
