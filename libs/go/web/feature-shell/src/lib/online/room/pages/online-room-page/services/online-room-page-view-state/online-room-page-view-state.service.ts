import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { map } from 'rxjs';
import {
  OnlineRoomBoardSectionViewModel,
  OnlineRoomPageStatusViewModel,
  OnlineRoomSeatViewModel,
  OnlineRoomSidebarMessageViewModel,
  OnlineRoomSidebarRematchStatusViewModel,
  OnlineRoomStageViewModel,
} from '../../../../contracts/online-room-view.contracts';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';

@Injectable()
export class OnlineRoomPageViewStateService {
  readonly onlineRoom = inject(OnlineRoomService);
  readonly i18n = inject(GoI18nService);

  private readonly route = inject(ActivatedRoute);

  readonly roomId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('roomId')?.toUpperCase() ?? null)),
    {
      initialValue: null,
    }
  );
  readonly snapshot = this.onlineRoom.snapshot;
  readonly match = this.onlineRoom.match;
  readonly participants = this.onlineRoom.participants;
  readonly rematch = this.onlineRoom.rematch;
  readonly nextMatchSettings = this.onlineRoom.nextMatchSettings;
  readonly connectionState = this.onlineRoom.connectionState;
  readonly bootstrapState = this.onlineRoom.bootstrapState;
  readonly realtimeConnected = computed(() => this.connectionState() === 'connected');
  readonly isLiveMatch = computed(() => {
    const phase = this.match()?.state.phase;
    return phase ? phase !== 'finished' : false;
  });
  readonly roomStage = computed<OnlineRoomStageViewModel | null>(() => {
    const snapshot = this.snapshot();

    if (!snapshot || this.match()) {
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
  });
  readonly loadingStatusView = computed<OnlineRoomPageStatusViewModel>(() => ({
    eyebrow: this.roomId()
      ? this.i18n.t('room.hero.title', { roomId: this.roomId()! })
      : this.i18n.t('room.hero.loading_title'),
    title: this.i18n.t('room.page.loading'),
    description: null,
    actionLabel: null,
  }));
  readonly missingStatusView = computed<OnlineRoomPageStatusViewModel>(() => ({
    eyebrow: this.i18n.t('room.page.missing.label'),
    title: this.i18n.t('room.page.missing.title'),
    description: this.i18n.t('room.page.missing.description'),
    actionLabel: this.i18n.t('room.page.missing.action'),
  }));
  readonly seats = computed<OnlineRoomSeatViewModel[]>(() => {
    const snapshot = this.snapshot();
    const canChangeSeats = this.onlineRoom.canChangeSeats();
    const participantId = this.onlineRoom.participantId();
    const viewerSeat = this.onlineRoom.viewerSeat();

    if (!snapshot) {
      return [];
    }

    return (['black', 'white'] as const).map(color => ({
      color,
      occupant:
        snapshot.participants.find(
          participant => participant.participantId === snapshot.seatState[color]
        ) ?? null,
      canClaim: !!participantId && canChangeSeats && !snapshot.seatState[color],
      isViewerSeat: viewerSeat === color,
    }));
  });
  readonly lastPlacedPoint = computed(() => {
    const command = this.match()?.state.lastMove?.command;
    return command?.type === 'place' ? command.point : null;
  });
  readonly canPass = computed(
    () =>
      this.realtimeConnected() &&
      this.match()?.settings.mode === 'go' &&
      this.onlineRoom.isActivePlayer()
  );
  readonly canResign = computed(
    () =>
      this.realtimeConnected() &&
      !!this.onlineRoom.viewerSeat() &&
      this.match()?.state.phase === 'playing'
  );
  readonly rematchViewerSeat = computed<PlayerColor | null>(() => {
    const participantId = this.onlineRoom.participantId();
    const rematch = this.rematch();

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
  });
  readonly canRespondToRematch = computed(() => {
    const viewerSeat = this.rematchViewerSeat();

    return (
      this.realtimeConnected() &&
      !!viewerSeat &&
      this.rematch()?.responses[viewerSeat] === 'pending'
    );
  });
  readonly rematchStatuses = computed<OnlineRoomSidebarRematchStatusViewModel[]>(() => {
    const rematch = this.rematch();

    if (!rematch) {
      return [];
    }

    return (['black', 'white'] as const).map(color => {
      const participantId = rematch.participants[color];
      const participant = this.participants().find(
        currentParticipant => currentParticipant.participantId === participantId
      );

      return {
        color,
        name: participant?.displayName ?? this.i18n.playerLabel(color),
        response: rematch.responses[color],
        isViewer: this.onlineRoom.participantId() === participantId,
      };
    });
  });
  readonly joinCardTitle = computed(() =>
    this.isLiveMatch()
      ? this.i18n.t('room.join.title.spectator')
      : this.i18n.t('room.join.title.pre_match')
  );
  readonly joinCardDescription = computed(() =>
    this.isLiveMatch()
      ? this.i18n.t('room.join.description.spectator')
      : this.i18n.t('room.join.description.pre_match')
  );
  readonly connectionLabel = computed(() => {
    switch (this.connectionState()) {
      case 'connected':
        return this.i18n.t('room.connection.connected');
      case 'connecting':
        return this.i18n.t('room.connection.connecting');
      case 'disconnected':
        return this.i18n.t('room.connection.reconnecting');
      default:
        return this.i18n.t('room.connection.offline');
    }
  });
  readonly chatHelperText = computed(() => {
    if (!this.onlineRoom.participantId()) {
      return this.i18n.t('room.chat.helper.join');
    }

    if (!this.realtimeConnected()) {
      return this.i18n.t('room.client.realtime_unavailable');
    }

    if (this.onlineRoom.isMuted()) {
      return this.i18n.t('room.chat.helper.muted');
    }

    return '';
  });
  readonly connectionWarning = computed(() =>
    this.onlineRoom.participantId() && !this.realtimeConnected()
      ? this.i18n.t('room.client.realtime_unavailable')
      : null
  );
  readonly roomMessages = computed<OnlineRoomSidebarMessageViewModel[]>(() => {
    const messages: OnlineRoomSidebarMessageViewModel[] = [];

    if (this.onlineRoom.lastError()) {
      messages.push({
        tone: 'error',
        message: this.onlineRoom.lastError()!,
        testId: 'room-sidebar-message-error',
      });
    }

    if (
      this.onlineRoom.lastNotice() &&
      this.onlineRoom.lastSystemNotice()?.message.key !== 'room.notice.match_started_auto'
    ) {
      messages.push({
        tone: 'notice',
        message: this.onlineRoom.lastNotice()!,
        testId: 'room-sidebar-message-notice',
      });
    }

    if (this.connectionWarning()) {
      messages.push({
        tone: 'warning',
        message: this.connectionWarning()!,
        testId: 'room-sidebar-message-warning',
      });
    }

    if (
      this.match()?.state.phase === 'finished' &&
      !this.rematch() &&
      this.onlineRoom.autoStartBlockedUntilSeatChange()
    ) {
      messages.push({
        tone: 'warning',
        message: this.i18n.t('room.rematch.blocked'),
        testId: 'room-sidebar-message-rematch-blocked',
      });
    }

    return messages;
  });
  readonly matchStatusLine = computed(() => {
    const match = this.match();

    if (!match || match.state.phase === 'playing' || match.state.result?.reason === 'resign') {
      return null;
    }

    return this.i18n.translateMessage(match.state.result?.summary ?? match.state.message);
  });
  readonly boardSection = computed<OnlineRoomBoardSectionViewModel>(() => ({
    lastPlacedPoint: this.lastPlacedPoint(),
    interactive: this.onlineRoom.canInteractBoard() && this.realtimeConnected(),
    statusLine: this.matchStatusLine(),
  }));

  constructor() {
    effect(() => {
      const roomId = this.roomId();

      if (roomId) {
        untracked(() => {
          this.onlineRoom.bootstrapRoom(roomId);
        });
      }
    });
  }
}
