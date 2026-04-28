import { Injectable, inject } from '@angular/core';
import {
  HostedMatchSnapshot,
  HostedRematchState,
  ParticipantSummary,
  RoomSnapshot,
  SystemNotice,
} from '@gx/go/contracts';
import { BoardPoint, PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  OnlineRoomBoardSectionViewModel,
  OnlineRoomNigiriViewModel,
  OnlineRoomPageStatusViewModel,
  OnlineRoomSeatViewModel,
  OnlineRoomFeedbackMessageViewModel,
  OnlineRoomSidebarRematchStatusViewModel,
  OnlineRoomStageViewModel,
} from '../../contracts/online-room-view.contracts';
import {
  OnlineRoomPageParticipantsPresentationService,
  RoomNigiriViewState,
  RoomSeatViewOptions,
} from './services/online-room-page-participants-presentation.service';

interface RoomFeedbackMessageState {
  lastError: string | null;
  lastNotice: string | null;
  lastSystemNotice: SystemNotice | null;
  connectionWarning: string | null;
  match: HostedMatchSnapshot | null;
  rematch: HostedRematchState | null;
  autoStartBlockedUntilSeatChange: boolean;
}

interface RoomBoardSectionState {
  lastPlacedPoint: BoardPoint | null;
  canInteractBoard: boolean;
  realtimeConnected: boolean;
  match: HostedMatchSnapshot | null;
}

@Injectable({ providedIn: 'root' })
export class OnlineRoomPagePresentationService {
  private readonly i18n = inject(GoI18nService);
  private readonly participantsPresentation = inject(
    OnlineRoomPageParticipantsPresentationService,
  );

  buildRoomStageViewModel(
    snapshot: RoomSnapshot | null,
    match: HostedMatchSnapshot | null,
  ): OnlineRoomStageViewModel | null {
    if (!snapshot || match) {
      return null;
    }

    if (
      snapshot.autoStartBlockedUntilSeatChange &&
      snapshot.seatState.black &&
      snapshot.seatState.white
    ) {
      return {
        label: this.i18n.t('room.stage.blocked.label'),
        title: this.i18n.t('room.stage.blocked.title'),
        description: this.i18n.t('room.stage.blocked.description'),
      };
    }

    if (snapshot.nigiri?.status === 'pending') {
      return {
        label: this.i18n.t('room.stage.nigiri.label'),
        title: this.i18n.t('room.stage.nigiri.title'),
        description: this.i18n.t('room.stage.nigiri.description'),
      };
    }

    if (snapshot.seatState.black && snapshot.seatState.white) {
      return {
        label: this.i18n.t('room.stage.ready.label'),
        title: this.i18n.t('room.stage.ready.title'),
        description: this.i18n.t('room.stage.ready.description'),
      };
    }

    return {
      label: this.i18n.t('room.stage.waiting.label'),
      title: this.i18n.t('room.stage.waiting.title'),
      description: this.i18n.t('room.stage.waiting.description'),
    };
  }

  buildRoomLoadingStatusView(
    roomId: string | null,
  ): OnlineRoomPageStatusViewModel {
    return {
      eyebrow: roomId
        ? this.i18n.t('room.hero.title', { roomId })
        : this.i18n.t('room.hero.loading_title'),
      title: this.i18n.t('room.page.loading'),
      description: null,
      actionLabel: null,
    };
  }

  buildRoomMissingStatusView(): OnlineRoomPageStatusViewModel {
    return {
      eyebrow: this.i18n.t('room.page.missing.label'),
      title: this.i18n.t('room.page.missing.title'),
      description: this.i18n.t('room.page.missing.description'),
      actionLabel: this.i18n.t('room.page.missing.action'),
    };
  }

  buildRoomSeatViewModels(
    snapshot: RoomSnapshot | null,
    options: RoomSeatViewOptions,
  ): OnlineRoomSeatViewModel[] {
    return this.participantsPresentation.buildRoomSeatViewModels(
      snapshot,
      options,
    );
  }

  buildRoomNigiriViewModel(
    state: RoomNigiriViewState,
  ): OnlineRoomNigiriViewModel | null {
    return this.participantsPresentation.buildRoomNigiriViewModel(state);
  }

  isLiveHostedMatch(match: HostedMatchSnapshot | null): boolean {
    const phase = match?.state.phase;
    return phase ? phase !== 'finished' : false;
  }

  findRoomRematchViewerSeat(
    participantId: string | null,
    rematch: HostedRematchState | null,
  ): PlayerColor | null {
    return this.participantsPresentation.findRoomRematchViewerSeat(
      participantId,
      rematch,
    );
  }

  buildRoomRematchStatuses(
    participants: readonly ParticipantSummary[],
    rematch: HostedRematchState | null,
    viewerParticipantId: string | null,
  ): OnlineRoomSidebarRematchStatusViewModel[] {
    return this.participantsPresentation.buildRoomRematchStatuses(
      participants,
      rematch,
      viewerParticipantId,
    );
  }

  connectionStateLabel(
    connectionState: 'idle' | 'connecting' | 'connected' | 'disconnected',
  ): string {
    switch (connectionState) {
      case 'connected':
        return this.i18n.t('room.connection.connected');
      case 'connecting':
        return this.i18n.t('room.connection.connecting');
      case 'disconnected':
        return this.i18n.t('room.connection.reconnecting');
      default:
        return this.i18n.t('room.connection.offline');
    }
  }

  buildRoomFeedbackMessages(
    state: RoomFeedbackMessageState,
  ): OnlineRoomFeedbackMessageViewModel[] {
    const messages: OnlineRoomFeedbackMessageViewModel[] = [];

    if (state.lastError) {
      messages.push({
        tone: 'error',
        lifetime: 'transient',
        closable: true,
        message: state.lastError,
      });
    }

    if (
      state.lastNotice &&
      state.lastSystemNotice?.message.key !== 'room.notice.match_started_auto'
    ) {
      messages.push({
        tone: 'notice',
        lifetime: 'transient',
        closable: true,
        message: state.lastNotice,
      });
    }

    if (state.connectionWarning) {
      messages.push({
        tone: 'warning',
        lifetime: 'stateful',
        closable: true,
        message: state.connectionWarning,
      });
    }

    if (
      state.match?.state.phase === 'finished' &&
      !state.rematch &&
      state.autoStartBlockedUntilSeatChange
    ) {
      messages.push({
        tone: 'warning',
        lifetime: 'stateful',
        closable: true,
        message: this.i18n.t('room.rematch.blocked'),
      });
    }

    return messages;
  }

  buildMatchStatusLine(match: HostedMatchSnapshot | null): string | null {
    if (
      !match ||
      match.state.phase === 'playing' ||
      match.state.result?.reason === 'resign'
    ) {
      return null;
    }

    if (match.state.phase === 'scoring') {
      const score = match.state.scoring?.score;

      if (score) {
        return `${this.i18n.t('ui.match_sidebar.score_preview')}: ${this.i18n.playerLabel('black')} ${score.black.toFixed(1)}, ${this.i18n.playerLabel('white')} ${score.white.toFixed(1)}`;
      }
    }

    return this.i18n.translateMessage(
      match.state.result?.summary ?? match.state.message,
    );
  }

  buildRoomBoardSection(
    state: RoomBoardSectionState,
  ): OnlineRoomBoardSectionViewModel {
    return {
      lastPlacedPoint: state.lastPlacedPoint,
      interactive: state.canInteractBoard && state.realtimeConnected,
      statusLine: this.buildMatchStatusLine(state.match),
    };
  }
}
