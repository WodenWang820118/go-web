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
import {
  buildRoomBoardSection,
  buildRoomLoadingStatusView,
  buildRoomMissingStatusView,
  buildRoomRematchStatuses,
  buildRoomSeatViewModels,
  buildRoomSidebarMessages,
  buildRoomStageViewModel,
  connectionStateLabel,
  findRoomRematchViewerSeat,
  isLiveHostedMatch,
} from '../../online-room-page.presentation';

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
  readonly isLiveMatch = computed(() => isLiveHostedMatch(this.match()));
  readonly roomStage = computed<OnlineRoomStageViewModel | null>(() => {
    return buildRoomStageViewModel(this.i18n, this.snapshot(), this.match());
  });
  readonly loadingStatusView = computed<OnlineRoomPageStatusViewModel>(() =>
    buildRoomLoadingStatusView(this.i18n, this.roomId())
  );
  readonly missingStatusView = computed<OnlineRoomPageStatusViewModel>(() =>
    buildRoomMissingStatusView(this.i18n)
  );
  readonly seats = computed<OnlineRoomSeatViewModel[]>(() => {
    return buildRoomSeatViewModels(this.snapshot(), {
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
      this.onlineRoom.isActivePlayer()
  );
  readonly canResign = computed(
    () =>
      this.realtimeConnected() &&
      !!this.onlineRoom.viewerSeat() &&
      this.match()?.state.phase === 'playing'
  );
  readonly rematchViewerSeat = computed<PlayerColor | null>(() =>
    findRoomRematchViewerSeat(this.onlineRoom.participantId(), this.rematch())
  );
  readonly canRespondToRematch = computed(() => {
    const viewerSeat = this.rematchViewerSeat();

    return (
      this.realtimeConnected() &&
      !!viewerSeat &&
      this.rematch()?.responses[viewerSeat] === 'pending'
    );
  });
  readonly rematchStatuses = computed<OnlineRoomSidebarRematchStatusViewModel[]>(() => {
    return buildRoomRematchStatuses(
      this.i18n,
      this.participants(),
      this.rematch(),
      this.onlineRoom.participantId()
    );
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
  readonly connectionLabel = computed(() =>
    connectionStateLabel(this.i18n, this.connectionState())
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
      : null
  );
  readonly roomMessages = computed<OnlineRoomSidebarMessageViewModel[]>(() => {
    return buildRoomSidebarMessages(this.i18n, {
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
    buildRoomBoardSection(this.i18n, {
      lastPlacedPoint: this.lastPlacedPoint(),
      canInteractBoard: this.onlineRoom.canInteractBoard(),
      realtimeConnected: this.realtimeConnected(),
      match: this.match(),
    })
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
