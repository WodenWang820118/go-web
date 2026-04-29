import { Injectable, effect, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import {
  GameStartSettings,
  MAX_DISPLAY_NAME_LENGTH,
  NigiriGuess,
  createUniqueDisplayName,
} from '@gx/go/contracts';
import { BoardPoint, PlayerColor } from '@gx/go/domain';
import { GoAnalyticsMatchActionType, GoAnalyticsService } from '@gx/go/state';
import { EMPTY, catchError, take } from 'rxjs';
import {
  OnlineRoomChatFormGroup,
  OnlineRoomJoinFormGroup,
} from '../../../../contracts/online-room-form.contracts';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { OnlineRoomPageViewStateService } from '../online-room-page-view-state/online-room-page-view-state.service';

@Injectable()
export class OnlineRoomPageInteractionsService {
  private readonly onlineRoom = inject(OnlineRoomService);
  private readonly view = inject(OnlineRoomPageViewStateService);
  private readonly analytics = inject(GoAnalyticsService);

  readonly joinForm: OnlineRoomJoinFormGroup = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
    }),
  });
  readonly chatForm: OnlineRoomChatFormGroup = new FormGroup({
    message: new FormControl('', {
      nonNullable: true,
    }),
  });

  constructor() {
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
  }

  joinRoom(): void {
    const roomId = this.view.roomId();
    const requestedDisplayName = this.joinForm.controls.displayName.value;

    if (!roomId) {
      return;
    }

    const resolvedDisplayName = createUniqueDisplayName(
      requestedDisplayName,
      this.view
        .snapshot()
        ?.participants.map((participant) => participant.displayName) ?? [],
      {
        maxLength: MAX_DISPLAY_NAME_LENGTH,
      },
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
        take(1),
      )
      .subscribe();
  }

  claimSeat(color: PlayerColor): void {
    this.onlineRoom.claimSeat(color);
  }

  releaseSeat(): void {
    this.onlineRoom.releaseSeat();
  }

  updateNextMatchSettings(settings: GameStartSettings): void {
    this.onlineRoom.updateNextMatchSettings(settings);
  }

  onBoardPoint(point: BoardPoint): void {
    if (!this.onlineRoom.canInteractBoard()) {
      return;
    }

    if (this.view.match()?.state.phase === 'scoring') {
      this.trackHostedMatchAction('toggle_dead');
      this.onlineRoom.sendGameCommand({
        type: 'toggle-dead',
        point,
      });
      return;
    }

    this.trackHostedMatchAction('place');
    this.onlineRoom.sendGameCommand({
      type: 'place',
      point,
    });
  }

  passTurn(): void {
    this.trackHostedMatchAction('pass');
    this.onlineRoom.sendGameCommand({
      type: 'pass',
    });
  }

  resign(): void {
    this.trackHostedMatchAction('resign');
    this.onlineRoom.sendGameCommand({
      type: 'resign',
    });
  }

  confirmScoring(): void {
    this.trackHostedMatchAction('confirm_scoring');
    this.onlineRoom.sendGameCommand({
      type: 'confirm-scoring',
    });
  }

  disputeScoring(): void {
    this.trackHostedMatchAction('dispute_scoring');
    this.onlineRoom.sendGameCommand({
      type: 'dispute-scoring',
    });
  }

  guessNigiri(guess: NigiriGuess): void {
    this.trackHostedMatchAction('nigiri_guess');
    this.onlineRoom.sendGameCommand({
      type: 'nigiri-guess',
      guess,
    });
  }

  sendChat(): void {
    const message = this.chatForm.controls.message.value.trim();

    if (message.length === 0) {
      return;
    }

    this.onlineRoom.sendChat(message);
    this.chatForm.controls.message.setValue('');
  }

  private trackHostedMatchAction(actionType: GoAnalyticsMatchActionType): void {
    this.analytics.track({
      action_type: actionType,
      event: 'gx_match_action',
      game_mode: this.view.match()?.settings.mode,
      play_context: 'hosted',
    });
  }
}
