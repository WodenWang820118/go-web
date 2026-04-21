import {
  HostedMatchSnapshot,
  HostedRematchState,
  ParticipantSummary,
  RoomSnapshot,
  SystemNotice,
} from '@gx/go/contracts';
import { BoardPoint, GoMessageDescriptor, PlayerColor } from '@gx/go/domain';
import {
  OnlineRoomBoardSectionViewModel,
  OnlineRoomPageStatusViewModel,
  OnlineRoomSeatViewModel,
  OnlineRoomSidebarMessageViewModel,
  OnlineRoomSidebarRematchStatusViewModel,
  OnlineRoomStageViewModel,
} from '../../contracts/online-room-view.contracts';

type TranslationReader = {
  t(key: string, params?: Record<string, unknown>): string;
  translateMessage(message: GoMessageDescriptor): string;
  playerLabel(color: PlayerColor): string;
};

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

export function buildRoomStageViewModel(
  i18n: TranslationReader,
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
      label: i18n.t('room.stage.blocked.label'),
      title: i18n.t('room.stage.blocked.title'),
      description: i18n.t('room.stage.blocked.description'),
    };
  }

  if (snapshot.seatState.black && snapshot.seatState.white) {
    return {
      label: i18n.t('room.stage.ready.label'),
      title: i18n.t('room.stage.ready.title'),
      description: i18n.t('room.stage.ready.description'),
    };
  }

  return {
    label: i18n.t('room.stage.waiting.label'),
    title: i18n.t('room.stage.waiting.title'),
    description: i18n.t('room.stage.waiting.description'),
  };
}

export function buildRoomLoadingStatusView(
  i18n: TranslationReader,
  roomId: string | null,
): OnlineRoomPageStatusViewModel {
  return {
    eyebrow: roomId
      ? i18n.t('room.hero.title', { roomId })
      : i18n.t('room.hero.loading_title'),
    title: i18n.t('room.page.loading'),
    description: null,
    actionLabel: null,
  };
}

export function buildRoomMissingStatusView(
  i18n: TranslationReader,
): OnlineRoomPageStatusViewModel {
  return {
    eyebrow: i18n.t('room.page.missing.label'),
    title: i18n.t('room.page.missing.title'),
    description: i18n.t('room.page.missing.description'),
    actionLabel: i18n.t('room.page.missing.action'),
  };
}

export function buildRoomSeatViewModels(
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

export function isLiveHostedMatch(match: HostedMatchSnapshot | null): boolean {
  const phase = match?.state.phase;
  return phase ? phase !== 'finished' : false;
}

export function findRoomRematchViewerSeat(
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

export function buildRoomRematchStatuses(
  i18n: TranslationReader,
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
      name: participant?.displayName ?? i18n.playerLabel(color),
      response: rematch.responses[color],
      isViewer: viewerParticipantId === participantId,
    };
  });
}

export function connectionStateLabel(
  i18n: TranslationReader,
  connectionState: 'idle' | 'connecting' | 'connected' | 'disconnected',
): string {
  switch (connectionState) {
    case 'connected':
      return i18n.t('room.connection.connected');
    case 'connecting':
      return i18n.t('room.connection.connecting');
    case 'disconnected':
      return i18n.t('room.connection.reconnecting');
    default:
      return i18n.t('room.connection.offline');
  }
}

export function buildRoomSidebarMessages(
  i18n: TranslationReader,
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
      message: i18n.t('room.rematch.blocked'),
      testId: 'room-sidebar-message-rematch-blocked',
    });
  }

  return messages;
}

export function buildMatchStatusLine(
  i18n: TranslationReader,
  match: HostedMatchSnapshot | null,
): string | null {
  if (
    !match ||
    match.state.phase === 'playing' ||
    match.state.result?.reason === 'resign'
  ) {
    return null;
  }

  return i18n.translateMessage(
    match.state.result?.summary ?? match.state.message,
  );
}

export function buildRoomBoardSection(
  i18n: TranslationReader,
  state: RoomBoardSectionState,
): OnlineRoomBoardSectionViewModel {
  return {
    lastPlacedPoint: state.lastPlacedPoint,
    interactive: state.canInteractBoard && state.realtimeConnected,
    statusLine: buildMatchStatusLine(i18n, state.match),
  };
}
