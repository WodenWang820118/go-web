import { ParticipantSummary } from '@org/go/contracts';
import { PlayerColor } from '@org/go/domain';

export interface OnlineRoomStageViewModel {
  label: string;
  title: string;
  description: string;
}

export interface OnlineRoomSeatViewModel {
  color: PlayerColor;
  occupant: ParticipantSummary | null;
  canClaim: boolean;
  isViewerSeat: boolean;
}
