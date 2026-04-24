import { NigiriGuess, ParticipantSummary } from '@gx/go/contracts';
import { BoardPoint, PlayerColor } from '@gx/go/domain';

export type OnlineRoomShareChipFeedbackState = 'idle' | 'success' | 'manual';

export interface OnlineRoomStageViewModel {
  readonly label: string;
  readonly title: string;
  readonly description: string;
}

export interface OnlineRoomPageStatusViewModel {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string | null;
  readonly actionLabel: string | null;
}

export interface OnlineRoomShareChipViewModel {
  readonly shareUrl: string | null;
  readonly shareLabel: string;
  readonly copiedLabel: string;
  readonly copyAriaLabel: string;
  readonly retryAriaLabel: string;
  readonly copiedMessage: string;
  readonly copyFailedMessage: string;
  readonly manualCopyInstruction: string;
  readonly manualUrlAriaLabel: string;
  readonly dismissLabel: string;
  readonly connectionState:
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'disconnected';
  readonly connectionLabel: string;
  readonly feedbackState: OnlineRoomShareChipFeedbackState;
}

export interface OnlineRoomBoardSectionViewModel {
  readonly lastPlacedPoint: BoardPoint | null;
  readonly interactive: boolean;
  readonly statusLine: string | null;
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

export interface OnlineRoomNigiriViewModel {
  readonly status: 'pending' | 'resolved';
  readonly title: string;
  readonly description: string;
  readonly commitmentLabel: string;
  readonly commitment: string;
  readonly canGuess: boolean;
  readonly oddLabel: string;
  readonly evenLabel: string;
  readonly resultLabel: string | null;
  readonly assignedBlackLabel: string | null;
  readonly guess?: NigiriGuess;
  readonly parity?: NigiriGuess;
}
