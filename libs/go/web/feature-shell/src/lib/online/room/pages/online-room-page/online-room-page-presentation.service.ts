import { Injectable, inject } from '@angular/core';
import {
  HostedMatchSnapshot,
  HostedNigiriSnapshot,
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
  OnlineRoomSidebarMessageViewModel,
  OnlineRoomSidebarRematchStatusViewModel,
  OnlineRoomStageViewModel,
} from '../../contracts/online-room-view.contracts';

interface RoomSeatViewOptions {
  participantId: string | null;
  viewerSeat: PlayerColor | null;
  canChangeSeats: boolean;
}

interface RoomSidebarMessageState {
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

interface RoomNigiriViewState {
  nigiri: HostedNigiriSnapshot | null;
  participants: readonly ParticipantSummary[];
  viewerSeat: PlayerColor | null;
  realtimeConnected: boolean;
}

@Injectable({ providedIn: 'root' })
export class OnlineRoomPagePresentationService {
  private readonly i18n = inject(GoI18nService);

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
    if (!snapshot) {
      return [];
    }

    return (['black', 'white'] as const).map((color) => ({
      color,
      occupant:
        snapshot.participants.find(
          (participant) =>
            participant.participantId === snapshot.seatState[color],
        ) ?? null,
      canClaim:
        !!options.participantId &&
        options.canChangeSeats &&
        !snapshot.seatState[color],
      isViewerSeat: options.viewerSeat === color,
    }));
  }

  buildRoomNigiriViewModel(
    state: RoomNigiriViewState,
  ): OnlineRoomNigiriViewModel | null {
    const nigiri = state.nigiri;

    if (!nigiri) {
      return null;
    }

    const guesser = this.findParticipantBySeat(
      state.participants,
      nigiri.guesser,
    );
    const guesserName =
      guesser?.displayName ?? this.i18n.playerLabel(nigiri.guesser);

    if (nigiri.status === 'pending') {
      return {
        status: 'pending',
        title: this.i18n.t('room.nigiri.pending.title'),
        description: this.i18n.t('room.nigiri.pending.description', {
          player: guesserName,
        }),
        commitmentLabel: this.i18n.t('room.nigiri.commitment'),
        commitment: nigiri.commitment,
        canGuess:
          state.realtimeConnected && state.viewerSeat === nigiri.guesser,
        oddLabel: this.i18n.t('room.nigiri.guess.odd'),
        evenLabel: this.i18n.t('room.nigiri.guess.even'),
        resultLabel: null,
        assignedBlackLabel: null,
      };
    }

    const assignedBlackName =
      this.findParticipantBySeat(state.participants, 'black')?.displayName ??
      this.i18n.playerLabel('black');

    return {
      status: 'resolved',
      title: this.i18n.t('room.nigiri.resolved.title'),
      description: this.i18n.t('room.nigiri.resolved.description', {
        player: assignedBlackName,
      }),
      commitmentLabel: this.i18n.t('room.nigiri.commitment'),
      commitment: nigiri.commitment,
      canGuess: false,
      oddLabel: this.i18n.t('room.nigiri.guess.odd'),
      evenLabel: this.i18n.t('room.nigiri.guess.even'),
      resultLabel: this.i18n.t('room.nigiri.resolved.result', {
        guess: this.i18n.t(`room.nigiri.guess.${nigiri.guess}`),
        parity: this.i18n.t(`room.nigiri.guess.${nigiri.parity}`),
      }),
      assignedBlackLabel: this.i18n.t('room.nigiri.resolved.assigned_black', {
        player: assignedBlackName,
      }),
      guess: nigiri.guess,
      parity: nigiri.parity,
    };
  }

  isLiveHostedMatch(match: HostedMatchSnapshot | null): boolean {
    const phase = match?.state.phase;
    return phase ? phase !== 'finished' : false;
  }

  findRoomRematchViewerSeat(
    participantId: string | null,
    rematch: HostedRematchState | null,
  ): PlayerColor | null {
    if (!participantId || !rematch) {
      return null;
    }

    if (rematch.participants.black === participantId) {
      return 'black';
    }

    if (rematch.participants.white === participantId) {
      return 'white';
    }

    return null;
  }

  buildRoomRematchStatuses(
    participants: readonly ParticipantSummary[],
    rematch: HostedRematchState | null,
    viewerParticipantId: string | null,
  ): OnlineRoomSidebarRematchStatusViewModel[] {
    if (!rematch) {
      return [];
    }

    return (['black', 'white'] as const).map((color) => {
      const participantId = rematch.participants[color];
      const participant = participants.find(
        (currentParticipant) =>
          currentParticipant.participantId === participantId,
      );

      return {
        color,
        name: participant?.displayName ?? this.i18n.playerLabel(color),
        response: rematch.responses[color],
        isViewer: viewerParticipantId === participantId,
      };
    });
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

  buildRoomSidebarMessages(
    state: RoomSidebarMessageState,
  ): OnlineRoomSidebarMessageViewModel[] {
    const messages: OnlineRoomSidebarMessageViewModel[] = [];

    if (state.lastError) {
      messages.push({
        tone: 'error',
        message: state.lastError,
        testId: 'room-sidebar-message-error',
      });
    }

    if (
      state.lastNotice &&
      state.lastSystemNotice?.message.key !== 'room.notice.match_started_auto'
    ) {
      messages.push({
        tone: 'notice',
        message: state.lastNotice,
        testId: 'room-sidebar-message-notice',
      });
    }

    if (state.connectionWarning) {
      messages.push({
        tone: 'warning',
        message: state.connectionWarning,
        testId: 'room-sidebar-message-warning',
      });
    }

    if (
      state.match?.state.phase === 'finished' &&
      !state.rematch &&
      state.autoStartBlockedUntilSeatChange
    ) {
      messages.push({
        tone: 'warning',
        message: this.i18n.t('room.rematch.blocked'),
        testId: 'room-sidebar-message-rematch-blocked',
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

  private findParticipantBySeat(
    participants: readonly ParticipantSummary[],
    seat: PlayerColor,
  ): ParticipantSummary | null {
    return (
      participants.find((participant) => participant.seat === seat) ?? null
    );
  }
}
