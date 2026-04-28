import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { OnlineRoomFeedbackMessageViewModel } from '../../../../contracts/online-room-view.contracts';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { OnlineRoomPageViewStateService } from '../online-room-page-view-state/online-room-page-view-state.service';

export const ROOM_FEEDBACK_TOAST_KEY = 'room-feedback';

@Injectable()
export class OnlineRoomPageFeedbackService {
  private readonly view = inject(OnlineRoomPageViewStateService);
  private readonly onlineRoom = inject(OnlineRoomService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  // PrimeNG prevents duplicate open toast rendering in the template. These sets
  // track the room feedback source lifecycle so transient signals emit once and
  // stale sticky warnings are removed when their underlying condition resolves.
  private readonly seenTransientKeys = new Set<string>();
  private previousStatefulKeys = new Set<string>();

  constructor() {
    effect(() => {
      const messages = this.view.roomFeedbackMessages();

      this.syncStatefulFeedback(
        messages.filter((message) => message.lifetime === 'stateful'),
      );
      this.emitTransientFeedback(
        messages.filter((message) => message.lifetime === 'transient'),
      );
    });

    this.destroyRef.onDestroy(() => {
      this.messageService.clear(ROOM_FEEDBACK_TOAST_KEY);
    });
  }

  private syncStatefulFeedback(
    messages: readonly OnlineRoomFeedbackMessageViewModel[],
  ): void {
    const nextKeys = new Set(
      messages.map((message) => this.feedbackKey(message)),
    );

    if (this.sameKeys(this.previousStatefulKeys, nextKeys)) {
      return;
    }

    this.previousStatefulKeys = nextKeys;

    untracked(() => {
      this.messageService.clear(ROOM_FEEDBACK_TOAST_KEY);

      if (messages.length === 0) {
        return;
      }

      this.messageService.addAll(
        messages.map((message) => this.toToastMessage(message)),
      );
    });
  }

  private emitTransientFeedback(
    messages: readonly OnlineRoomFeedbackMessageViewModel[],
  ): void {
    const currentKeys = new Set(
      messages.map((message) => this.feedbackKey(message)),
    );

    for (const seenKey of this.seenTransientKeys) {
      if (!currentKeys.has(seenKey)) {
        this.seenTransientKeys.delete(seenKey);
      }
    }

    const newMessages = messages.filter((message) => {
      const key = this.feedbackKey(message);

      if (this.seenTransientKeys.has(key)) {
        return false;
      }

      this.seenTransientKeys.add(key);
      return true;
    });

    if (newMessages.length === 0) {
      return;
    }

    untracked(() => {
      this.messageService.addAll(
        newMessages.map((message) => this.toToastMessage(message)),
      );
      this.onlineRoom.clearTransientMessages();
    });
  }

  private toToastMessage(
    message: OnlineRoomFeedbackMessageViewModel,
  ): ToastMessageOptions {
    return {
      key: ROOM_FEEDBACK_TOAST_KEY,
      severity: this.toastSeverity(message),
      detail: message.message,
      closable: message.closable,
      sticky: message.lifetime === 'stateful',
      life:
        message.lifetime === 'transient' ? this.toastLife(message) : undefined,
    };
  }

  private toastSeverity(
    message: OnlineRoomFeedbackMessageViewModel,
  ): 'error' | 'info' | 'warn' {
    switch (message.tone) {
      case 'error':
        return 'error';
      case 'notice':
        return 'info';
      default:
        return 'warn';
    }
  }

  private toastLife(message: OnlineRoomFeedbackMessageViewModel): number {
    return message.tone === 'error' ? 6000 : 4500;
  }

  private feedbackKey(message: OnlineRoomFeedbackMessageViewModel): string {
    return [message.lifetime, message.tone, message.message].join(':');
  }

  private sameKeys(left: Set<string>, right: Set<string>): boolean {
    if (left.size !== right.size) {
      return false;
    }

    for (const key of left) {
      if (!right.has(key)) {
        return false;
      }
    }

    return true;
  }
}
