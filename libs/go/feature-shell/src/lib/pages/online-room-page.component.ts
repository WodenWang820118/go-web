import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BoardPoint,
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  GameMode,
  PlayerColor,
  capitalizePlayerColor,
} from '@org/go/domain';
import { GameBoardComponent, GameStatusChipComponent, StoneBadgeComponent } from '@org/go/ui';
import { EMPTY, catchError, from, map, take, tap } from 'rxjs';
import { OnlineRoomService } from '../online/online-room.service';

@Component({
  selector: 'lib-go-online-room-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    GameBoardComponent,
    GameStatusChipComponent,
    StoneBadgeComponent,
  ],
  templateUrl: './online-room-page.component.html',
  styleUrl: './online-room-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomPageComponent {
  protected readonly DEFAULT_GO_KOMI = DEFAULT_GO_KOMI;
  protected readonly onlineRoom = inject(OnlineRoomService);

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
  protected readonly roomStage = computed(() => {
    const snapshot = this.snapshot();

    if (!snapshot || this.match()) {
      return null;
    }

    if (snapshot.seatState.black && snapshot.seatState.white) {
      return {
        label: 'Ready room',
        title: 'Players are matched and waiting for the host.',
        description:
          'Both seats are filled, spectators can already chat, and the host can start the next match at any time.',
      };
    }

    return {
      label: 'Waiting room',
      title: 'Open seats are still available.',
      description:
        'Players can claim black and white while spectators join early and keep the room chat moving.',
    };
  });
  protected readonly seats = computed(() => {
    const snapshot = this.snapshot();

    if (!snapshot) {
      return [];
    }

    return (['black', 'white'] as const).map(color => ({
      color,
      occupant:
        snapshot.participants.find(
          participant => participant.participantId === snapshot.seatState[color]
        ) ?? null,
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
    this.startMode() === 'go' ? [...GO_BOARD_SIZES] : [GOMOKU_BOARD_SIZE]
  );
  protected readonly canPass = computed(
    () => this.match()?.settings.mode === 'go' && this.onlineRoom.isActivePlayer()
  );
  protected readonly canResign = computed(
    () => !!this.onlineRoom.viewerSeat() && this.match()?.state.phase === 'playing'
  );
  protected readonly canFinalizeScoring = computed(
    () =>
      !!this.onlineRoom.viewerSeat() &&
      this.match()?.settings.mode === 'go' &&
      this.match()?.state.phase === 'scoring'
  );
  protected readonly canStartMatch = computed(
    () =>
      this.onlineRoom.isHost() &&
      this.onlineRoom.canChangeSeats() &&
      !!this.snapshot()?.seatState.black &&
      !!this.snapshot()?.seatState.white
  );
  protected readonly shareUrl = this.onlineRoom.shareUrl;
  protected readonly joinCardTitle = computed(() =>
    this.match() ? 'Join as spectator' : 'Enter as a spectator or player'
  );
  protected readonly joinCardDescription = computed(() =>
    this.match()
      ? 'Live rooms are watch-and-chat only until the current match ends.'
      : 'Pick a display name to join the room before claiming a seat or chatting.'
  );

  protected readonly joinForm = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
    }),
  });
  protected readonly startForm = new FormGroup({
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
  protected readonly startMode = toSignal(this.startForm.controls.mode.valueChanges, {
    initialValue: this.startForm.controls.mode.value,
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

      if (
        displayName &&
        this.joinForm.controls.displayName.value !== displayName
      ) {
        this.joinForm.controls.displayName.setValue(displayName, {
          emitEvent: false,
        });
      }
    });

    effect(() => {
      const mode = this.startMode();
      const currentBoardSize = this.startForm.controls.boardSize.value;

      if (mode === 'gomoku' && currentBoardSize !== GOMOKU_BOARD_SIZE) {
        this.startForm.controls.boardSize.setValue(GOMOKU_BOARD_SIZE);
        return;
      }

      if (mode === 'go' && !GO_BOARD_SIZES.includes(currentBoardSize as 9 | 13 | 19)) {
        this.startForm.controls.boardSize.setValue(19);
      }
    });
  }

  protected joinRoom(): void {
    const roomId = this.roomId();

    if (!roomId) {
      return;
    }

    this.onlineRoom
      .joinRoom(roomId, this.joinForm.controls.displayName.value)
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

  protected startMatch(): void {
    const mode = this.startForm.controls.mode.value;
    const boardSize =
      mode === 'go'
        ? (this.startForm.controls.boardSize.value as 9 | 13 | 19)
        : GOMOKU_BOARD_SIZE;

    this.onlineRoom.startMatch({
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

  protected isViewerSeat(color: PlayerColor): boolean {
    return this.onlineRoom.viewerSeat() === color;
  }

  protected canClaimSeat(color: PlayerColor): boolean {
    const snapshot = this.snapshot();

    return (
      !!this.onlineRoom.participantId() &&
      this.onlineRoom.canChangeSeats() &&
      !!snapshot &&
      !snapshot.seatState[color]
    );
  }

  protected connectionLabel(): string {
    switch (this.onlineRoom.connectionState()) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting';
      case 'disconnected':
        return 'Reconnecting';
      default:
        return 'Offline';
    }
  }

  protected capitalizePlayer(color: PlayerColor): string {
    return capitalizePlayerColor(color);
  }
}
