import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MAX_DISPLAY_NAME_LENGTH, createUniqueDisplayName } from '@gx/go/contracts';
import { BoardPoint, PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameBoardComponent } from '@gx/go/ui';
import { EMPTY, catchError, from, map, take, tap } from 'rxjs';
import {
  OnlineRoomSeatViewModel,
  OnlineRoomStageViewModel,
} from '../online-room-page.models';
import { OnlineRoomSidebarComponent } from '../online-room-sidebar/online-room-sidebar.component';
import { OnlineRoomService } from '../services/online-room/online-room.service';

interface OnlineRoomRematchStatusViewModel {
  color: PlayerColor;
  name: string;
  response: 'pending' | 'accepted' | 'declined';
  isViewer: boolean;
}

interface OnlineRoomSidebarMessageViewModel {
  tone: 'error' | 'notice' | 'warning';
  message: string;
  testId: string;
}

@Component({
  selector: 'lib-go-online-room-page',
  standalone: true,
  imports: [CommonModule, RouterLink, GameBoardComponent, OnlineRoomSidebarComponent],
  templateUrl: './online-room-page.component.html',
  styleUrl: './online-room-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomPageComponent {
  protected readonly onlineRoom = inject(OnlineRoomService);
  protected readonly i18n = inject(GoI18nService);

  private readonly route = inject(ActivatedRoute);

  protected readonly roomId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('roomId')?.toUpperCase() ?? null)),
    {
      initialValue: null,
    }
  );
  protected readonly snapshot = this.onlineRoom.snapshot;
  protected readonly match = this.onlineRoom.match;
  protected readonly participants = this.onlineRoom.participants;
  protected readonly rematch = this.onlineRoom.rematch;
  protected readonly nextMatchSettings = this.onlineRoom.nextMatchSettings;
  protected readonly connectionState = this.onlineRoom.connectionState;
  protected readonly realtimeConnected = computed(() => this.connectionState() === 'connected');
  protected readonly isLiveMatch = computed(() => {
    const phase = this.match()?.state.phase;
    return phase ? phase !== 'finished' : false;
  });
  protected readonly roomStage = computed<OnlineRoomStageViewModel | null>(() => {
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
  protected readonly seats = computed<OnlineRoomSeatViewModel[]>(() => {
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
  protected readonly lastPlacedPoint = computed(() => {
    const command = this.match()?.state.lastMove?.command;
    return command?.type === 'place' ? command.point : null;
  });
  protected readonly canPass = computed(
    () =>
      this.realtimeConnected() &&
      this.match()?.settings.mode === 'go' &&
      this.onlineRoom.isActivePlayer()
  );
  protected readonly canResign = computed(
    () =>
      this.realtimeConnected() &&
      !!this.onlineRoom.viewerSeat() &&
      this.match()?.state.phase === 'playing'
  );
  protected readonly canFinalizeScoring = computed(
    () =>
      this.realtimeConnected() &&
      !!this.onlineRoom.viewerSeat() &&
      this.match()?.settings.mode === 'go' &&
      this.match()?.state.phase === 'scoring'
  );
  protected readonly rematchViewerSeat = computed<PlayerColor | null>(() => {
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
  protected readonly canRespondToRematch = computed(() => {
    const viewerSeat = this.rematchViewerSeat();

    return (
      this.realtimeConnected() &&
      !!viewerSeat &&
      this.rematch()?.responses[viewerSeat] === 'pending'
    );
  });
  protected readonly rematchStatuses = computed<OnlineRoomRematchStatusViewModel[]>(() => {
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
  protected readonly showRematchBanner = computed(
    () => this.match()?.state.phase === 'finished' && !!this.rematch()
  );
  protected readonly shareUrl = this.onlineRoom.shareUrl;
  protected readonly joinCardTitle = computed(() =>
    this.isLiveMatch()
      ? this.i18n.t('room.join.title.spectator')
      : this.i18n.t('room.join.title.pre_match')
  );
  protected readonly joinCardDescription = computed(() =>
    this.isLiveMatch()
      ? this.i18n.t('room.join.description.spectator')
      : this.i18n.t('room.join.description.pre_match')
  );
  protected readonly connectionLabel = computed(() => {
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
  protected readonly chatHelperText = computed(() => {
    if (!this.onlineRoom.participantId()) {
      return this.i18n.t('room.chat.helper.join');
    }

    if (!this.realtimeConnected()) {
      return this.i18n.t('room.client.realtime_unavailable');
    }

    if (this.onlineRoom.isMuted()) {
      return this.i18n.t('room.chat.helper.muted');
    }

    return this.i18n.t('room.chat.helper.default');
  });
  protected readonly connectionWarning = computed(() =>
    this.onlineRoom.participantId() && !this.realtimeConnected()
      ? this.i18n.t('room.client.realtime_unavailable')
      : null
  );
  protected readonly roomMessages = computed<OnlineRoomSidebarMessageViewModel[]>(() => {
    const messages: OnlineRoomSidebarMessageViewModel[] = [];

    if (this.onlineRoom.lastError()) {
      messages.push({
        tone: 'error',
        message: this.onlineRoom.lastError()!,
        testId: 'room-sidebar-message-error',
      });
    }

    if (this.onlineRoom.lastNotice()) {
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
  protected readonly modeSummary = computed(() => {
    const settings = this.match()?.settings ?? this.nextMatchSettings();

    if (!settings) {
      return null;
    }

    return `${this.i18n.t(`common.mode.${settings.mode}`)} · ${settings.boardSize} x ${settings.boardSize}`;
  });
  protected readonly matchStatusLine = computed(() => {
    const match = this.match();

    if (!match) {
      return null;
    }

    if (match.state.phase === 'playing') {
      return null;
    }

    return this.i18n.translateMessage(match.state.result?.summary ?? match.state.message);
  });

  protected readonly joinForm = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
    }),
  });
  protected readonly chatForm = new FormGroup({
    message: new FormControl('', {
      nonNullable: true,
    }),
  });

  constructor() {
    effect(() => {
      const roomId = this.roomId();

      if (roomId) {
        this.onlineRoom.bootstrapRoom(roomId);
      }
    });

    effect(() => {
      const displayName = this.onlineRoom.displayName();

      if (displayName && this.joinForm.controls.displayName.value !== displayName) {
        this.joinForm.controls.displayName.setValue(displayName, {
          emitEvent: false,
        });
      }
    });
  }

  protected joinRoom(): void {
    const roomId = this.roomId();
    const requestedDisplayName = this.joinForm.controls.displayName.value;

    if (!roomId) {
      return;
    }

    const resolvedDisplayName = createUniqueDisplayName(
      requestedDisplayName,
      this.snapshot()?.participants.map(participant => participant.displayName) ?? [],
      {
        maxLength: MAX_DISPLAY_NAME_LENGTH,
      }
    );

    if (resolvedDisplayName !== requestedDisplayName) {
      this.joinForm.controls.displayName.setValue(resolvedDisplayName, {
        emitEvent: false,
      });
    }

    this.onlineRoom
      .joinRoom(roomId, resolvedDisplayName)
      .pipe(
        catchError(() => EMPTY),
        take(1)
      )
      .subscribe();
  }

  protected copyShareUrl(): void {
    const shareUrl = this.shareUrl();

    if (!shareUrl || typeof navigator === 'undefined' || !navigator.clipboard) {
      this.onlineRoom.clearTransientMessages();
      return;
    }

    from(navigator.clipboard.writeText(shareUrl))
      .pipe(
        tap(() => {
          this.onlineRoom.clearTransientMessages();
        }),
        catchError(() => {
          this.onlineRoom.clearTransientMessages();
          return EMPTY;
        }),
        take(1)
      )
      .subscribe();
  }

  protected claimSeat(color: PlayerColor): void {
    this.onlineRoom.claimSeat(color);
  }

  protected releaseSeat(): void {
    this.onlineRoom.releaseSeat();
  }

  protected onBoardPoint(point: BoardPoint): void {
    if (this.match()?.state.phase === 'scoring') {
      this.onlineRoom.sendGameCommand({
        type: 'toggle-dead',
        point,
      });
      return;
    }

    this.onlineRoom.sendGameCommand({
      type: 'place',
      point,
    });
  }

  protected passTurn(): void {
    this.onlineRoom.sendGameCommand({
      type: 'pass',
    });
  }

  protected resign(): void {
    this.onlineRoom.sendGameCommand({
      type: 'resign',
    });
  }

  protected finalizeScoring(): void {
    this.onlineRoom.sendGameCommand({
      type: 'finalize-scoring',
    });
  }

  protected acceptRematch(): void {
    this.onlineRoom.respondToRematch(true);
  }

  protected declineRematch(): void {
    this.onlineRoom.respondToRematch(false);
  }

  protected sendChat(): void {
    const message = this.chatForm.controls.message.value.trim();

    if (message.length === 0) {
      return;
    }

    this.onlineRoom.sendChat(message);
    this.chatForm.controls.message.setValue('');
  }
}
