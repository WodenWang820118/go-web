import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { map } from 'rxjs';
import {
  OnlineRoomBoardSectionViewModel,
  OnlineRoomNigiriViewModel,
  OnlineRoomPageStatusViewModel,
  OnlineRoomSeatViewModel,
  OnlineRoomFeedbackMessageViewModel,
  OnlineRoomSidebarRematchStatusViewModel,
  OnlineRoomStageViewModel,
} from '../../../../contracts/online-room-view.contracts';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { OnlineRoomPagePresentationService } from '../../online-room-page-presentation.service';

@Injectable()
export class OnlineRoomPageViewStateService {
  readonly onlineRoom = inject(OnlineRoomService);
  readonly i18n = inject(GoI18nService);
  readonly presentation = inject(OnlineRoomPagePresentationService);

  private readonly route = inject(ActivatedRoute);

  readonly roomId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('roomId')?.toUpperCase() ?? null),
    ),
    {
      initialValue: null,
    },
  );
  readonly snapshot = this.onlineRoom.snapshot;
  readonly match = this.onlineRoom.match;
  readonly participants = this.onlineRoom.participants;
  readonly rematch = this.onlineRoom.rematch;
  readonly nigiri = this.onlineRoom.nigiri;
  readonly nextMatchSettings = this.onlineRoom.nextMatchSettings;
  readonly connectionState = this.onlineRoom.connectionState;
  readonly bootstrapState = this.onlineRoom.bootstrapState;
  readonly realtimeConnected = computed(
    () => this.connectionState() === 'connected',
  );
  readonly isLiveMatch = computed(() =>
    this.presentation.isLiveHostedMatch(this.match()),
  );
  readonly roomStage = computed<OnlineRoomStageViewModel | null>(() => {
    return this.presentation.buildRoomStageViewModel(
      this.snapshot(),
      this.match(),
    );
  });
  readonly loadingStatusView = computed<OnlineRoomPageStatusViewModel>(() =>
    this.presentation.buildRoomLoadingStatusView(this.roomId()),
  );
  readonly missingStatusView = computed<OnlineRoomPageStatusViewModel>(() =>
    this.presentation.buildRoomMissingStatusView(),
  );
  readonly seats = computed<OnlineRoomSeatViewModel[]>(() => {
    return this.presentation.buildRoomSeatViewModels(this.snapshot(), {
      participantId: this.onlineRoom.participantId(),
      viewerSeat: this.onlineRoom.viewerSeat(),
      canChangeSeats: this.onlineRoom.canChangeSeats(),
    });
  });
  readonly lastPlacedPoint = computed(() => {
    const command = this.match()?.state.lastMove?.command;
    return command?.type === 'place' ? command.point : null;
  });
  readonly canPass = computed(
    () =>
      this.realtimeConnected() &&
      this.match()?.settings.mode === 'go' &&
      this.onlineRoom.isActivePlayer(),
  );
  readonly canResign = computed(
    () =>
      this.realtimeConnected() &&
      !!this.onlineRoom.viewerSeat() &&
      this.match()?.state.phase === 'playing',
  );
  readonly canConfirmScoring = computed(() => {
    const viewerSeat = this.onlineRoom.viewerSeat();
    const match = this.match();

    return (
      this.realtimeConnected() &&
      !!viewerSeat &&
      match?.settings.mode === 'go' &&
      match.state.phase === 'scoring' &&
      !(match.state.scoring?.confirmedBy ?? []).includes(viewerSeat)
    );
  });
  readonly canDisputeScoring = computed(
    () =>
      this.realtimeConnected() &&
      !!this.onlineRoom.viewerSeat() &&
      this.match()?.settings.mode === 'go' &&
      this.match()?.state.phase === 'scoring',
  );
  readonly rematchViewerSeat = computed<PlayerColor | null>(() =>
    this.presentation.findRoomRematchViewerSeat(
      this.onlineRoom.participantId(),
      this.rematch(),
    ),
  );
  readonly canRespondToRematch = computed(() => {
    const viewerSeat = this.rematchViewerSeat();

    return (
      this.realtimeConnected() &&
      !!viewerSeat &&
      this.rematch()?.responses[viewerSeat] === 'pending'
    );
  });
  readonly rematchStatuses = computed<
    OnlineRoomSidebarRematchStatusViewModel[]
  >(() => {
    return this.presentation.buildRoomRematchStatuses(
      this.participants(),
      this.rematch(),
      this.onlineRoom.participantId(),
    );
  });
  readonly nigiriPanel = computed<OnlineRoomNigiriViewModel | null>(() =>
    this.presentation.buildRoomNigiriViewModel({
      nigiri: this.nigiri(),
      participants: this.participants(),
      viewerSeat: this.onlineRoom.viewerSeat(),
      realtimeConnected: this.realtimeConnected(),
    }),
  );
  readonly joinCardTitle = computed(() =>
    this.isLiveMatch()
      ? this.i18n.t('room.join.title.spectator')
      : this.i18n.t('room.join.title.pre_match'),
  );
  readonly joinCardDescription = computed(() =>
    this.isLiveMatch()
      ? this.i18n.t('room.join.description.spectator')
      : this.i18n.t('room.join.description.pre_match'),
  );
  readonly connectionLabel = computed(() =>
    this.presentation.connectionStateLabel(this.connectionState()),
  );
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
      : null,
  );
  readonly roomFeedbackMessages = computed<
    OnlineRoomFeedbackMessageViewModel[]
  >(() => {
    return this.presentation.buildRoomFeedbackMessages({
      lastError: this.onlineRoom.lastError(),
      lastNotice: this.onlineRoom.lastNotice(),
      lastSystemNotice: this.onlineRoom.lastSystemNotice(),
      connectionWarning: this.connectionWarning(),
      match: this.match(),
      rematch: this.rematch(),
      autoStartBlockedUntilSeatChange:
        this.onlineRoom.autoStartBlockedUntilSeatChange(),
    });
  });
  readonly boardSection = computed<OnlineRoomBoardSectionViewModel>(() =>
    this.presentation.buildRoomBoardSection({
      lastPlacedPoint: this.lastPlacedPoint(),
      canInteractBoard: this.onlineRoom.canInteractBoard(),
      realtimeConnected: this.realtimeConnected(),
      match: this.match(),
    }),
  );

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
