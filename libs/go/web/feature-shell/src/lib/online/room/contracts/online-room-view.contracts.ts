import { ParticipantSummary } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';

export interface OnlineRoomStageViewModel {
  readonly label: string;
  readonly title: string;
  readonly description: string;
}

export interface OnlineRoomSeatViewModel {
  readonly color: PlayerColor;
  readonly occupant: ParticipantSummary | null;
  readonly canClaim: boolean;
  readonly isViewerSeat: boolean;
}

export interface OnlineRoomSidebarMessageViewModel {
  readonly tone: 'error' | 'notice' | 'warning';
  readonly message: string;
  readonly testId: string;
}

export interface OnlineRoomSidebarRematchStatusViewModel {
  readonly color: PlayerColor;
  readonly name: string;
  readonly response: 'pending' | 'accepted' | 'declined';
  readonly isViewer: boolean;
}
