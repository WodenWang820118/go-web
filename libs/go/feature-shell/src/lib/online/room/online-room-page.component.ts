import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MAX_DISPLAY_NAME_LENGTH, createUniqueDisplayName } from '@gx/go/contracts';
import {
  BoardPoint,
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  GameMode,
  PlayerColor,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameBoardComponent, StoneBadgeComponent } from '@gx/go/ui';
import { EMPTY, catchError, from, map, take, tap } from 'rxjs';
import { HostedShellHeaderComponent } from '../shared/hosted-shell-header.component';
import { OnlineRoomChatPanelComponent } from './online-room-chat-panel.component';
import { OnlineRoomHeroComponent } from './online-room-hero.component';
import { OnlineRoomMoveLogPanelComponent } from './online-room-move-log-panel.component';
import {
  OnlineRoomSeatViewModel,
  OnlineRoomStageViewModel,
} from './online-room-page.models';
import { OnlineRoomParticipantsPanelComponent } from './online-room-participants-panel.component';
import { OnlineRoomService } from './online-room.service';

interface OnlineRoomRematchStatusViewModel {
  color: PlayerColor;
  name: string;
  response: 'pending' | 'accepted' | 'declined';
  isViewer: boolean;
}

@Component({
  selector: 'lib-go-online-room-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GameBoardComponent,
    StoneBadgeComponent,
    HostedShellHeaderComponent,
    OnlineRoomHeroComponent,
    OnlineRoomParticipantsPanelComponent,
    OnlineRoomChatPanelComponent,
    OnlineRoomMoveLogPanelComponent,
  ],
  templateUrl: './online-room-page.component.html',
  styleUrl: './online-room-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomPageComponent {
  protected readonly DEFAULT_GO_KOMI = DEFAULT_GO_KOMI;
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
  protected readonly viewer = this.onlineRoom.viewer;
  protected readonly rematch = this.onlineRoom.rematch;
  protected readonly nextMatchSettings = this.onlineRoom.nextMatchSettings;
  protected readonly realtimeConnected = computed(
    () => this.onlineRoom.connectionState() === 'connected'
  );
  protected readonly isLiveMatch = computed(() => this.match()?.state.phase !== 'finished');
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
  protected readonly recentMoves = computed(() =>
    [...(this.match()?.state.moveHistory ?? [])].reverse()
  );
  protected readonly boardSizeOptions = computed(() =>
    this.settingsMode() === 'go' ? [...GO_BOARD_SIZES] : [GOMOKU_BOARD_SIZE]
  );
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
  protected readonly settingsLockedMessage = computed(() => {
    if (this.rematch()) {
      return this.i18n.t('room.next_match.locked.rematch');
    }

    if (this.match()?.state.phase !== 'finished' && this.match()) {
      return this.i18n.t('room.next_match.locked.live');
    }

    if (this.snapshot()?.seatState.black && this.snapshot()?.seatState.white) {
      return this.i18n.t('room.next_match.locked.filled');
    }

    return null;
  });
  protected readonly canEditNextMatchSettings = computed(
    () =>
      this.onlineRoom.isHost() &&
      this.realtimeConnected() &&
      !this.settingsLockedMessage()
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
  protected readonly canRespondToRematch = computed(
    () => {
      const viewerSeat = this.rematchViewerSeat();

      return (
        this.realtimeConnected() &&
        !!viewerSeat &&
        this.rematch()?.responses[viewerSeat] === 'pending'
      );
    }
  );
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
  protected readonly showAutoStartBlockedBanner = computed(
    () =>
      this.match()?.state.phase === 'finished' &&
      !this.rematch() &&
      this.onlineRoom.autoStartBlockedUntilSeatChange()
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
    switch (this.onlineRoom.connectionState()) {
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

  protected readonly joinForm = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
    }),
  });
  protected readonly settingsForm = new FormGroup({
    mode: new FormControl<GameMode>('go', {
      nonNullable: true,
    }),
    boardSize: new FormControl<number>(19, {
      nonNullable: true,
    }),
  });
  protected readonly chatForm = new FormGroup({
    message: new FormControl('', {
      nonNullable: true,
    }),
  });
  protected readonly settingsMode = toSignal(
    this.settingsForm.controls.mode.valueChanges,
    {
      initialValue: this.settingsForm.controls.mode.value,
    }
  );

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

    effect(() => {
      const nextMatchSettings = this.nextMatchSettings();

      if (!nextMatchSettings) {
        return;
      }

      if (this.settingsForm.controls.mode.value !== nextMatchSettings.mode) {
        this.settingsForm.controls.mode.setValue(nextMatchSettings.mode, {
          emitEvent: false,
        });
      }

      if (this.settingsForm.controls.boardSize.value !== nextMatchSettings.boardSize) {
        this.settingsForm.controls.boardSize.setValue(nextMatchSettings.boardSize, {
          emitEvent: false,
        });
      }
    });

    effect(() => {
      const mode = this.settingsMode();
      const currentBoardSize = this.settingsForm.controls.boardSize.value;

      if (mode === 'gomoku' && currentBoardSize !== GOMOKU_BOARD_SIZE) {
        this.settingsForm.controls.boardSize.setValue(GOMOKU_BOARD_SIZE);
        return;
      }

      if (mode === 'go' && !GO_BOARD_SIZES.includes(currentBoardSize as 9 | 13 | 19)) {
        this.settingsForm.controls.boardSize.setValue(19);
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

  protected saveNextMatchSettings(): void {
    const mode = this.settingsForm.controls.mode.value;
    const boardSize =
      mode === 'go'
        ? (this.settingsForm.controls.boardSize.value as 9 | 13 | 19)
        : GOMOKU_BOARD_SIZE;

    this.onlineRoom.updateNextMatchSettings({
      mode,
      boardSize,
      komi: mode === 'go' ? DEFAULT_GO_KOMI : 0,
    });
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

  protected muteParticipant(participantId: string): void {
    this.onlineRoom.muteParticipant(participantId);
  }

  protected unmuteParticipant(participantId: string): void {
    this.onlineRoom.unmuteParticipant(participantId);
  }

  protected kickParticipant(participantId: string): void {
    this.onlineRoom.kickParticipant(participantId);
  }
}
