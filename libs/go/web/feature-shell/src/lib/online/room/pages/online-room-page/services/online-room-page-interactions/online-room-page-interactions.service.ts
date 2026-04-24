import { Injectable, effect, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import {
  MAX_DISPLAY_NAME_LENGTH,
  createUniqueDisplayName,
} from '@gx/go/contracts';
import { BoardPoint, PlayerColor } from '@gx/go/domain';
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

  onBoardPoint(point: BoardPoint): void {
    if (!this.onlineRoom.canInteractBoard()) {
      return;
    }

    if (this.view.match()?.state.phase === 'scoring') {
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

  passTurn(): void {
    this.onlineRoom.sendGameCommand({
      type: 'pass',
    });
  }

  resign(): void {
    this.onlineRoom.sendGameCommand({
      type: 'resign',
    });
  }

  finalizeScoring(): void {
    this.onlineRoom.sendGameCommand({
      type: 'finalize-scoring',
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
}
