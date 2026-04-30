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
const TONE_PRIORITY: Record<
  OnlineRoomFeedbackMessageViewModel['tone'],
  number
> = {
  error: 3,
  warning: 2,
  notice: 1,
};

@Injectable()
export class OnlineRoomPageFeedbackService {
  private readonly view = inject(OnlineRoomPageViewStateService);
  private readonly onlineRoom = inject(OnlineRoomService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  // Room feedback intentionally shows one primary toast per lifetime/cycle.
  // Lower priority same-lifetime messages wait behind their active blocker.
  private readonly seenTransientKeys = new Set<string>();
  private readonly suppressedTransientBlockers = new Map<string, string>();
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
    const primaryMessage = this.selectPrimaryFeedback(messages);
    const nextKeys = new Set(
      primaryMessage ? [this.feedbackKey(primaryMessage)] : [],
    );

    if (this.sameKeys(this.previousStatefulKeys, nextKeys)) {
      return;
    }

    this.previousStatefulKeys = nextKeys;

    untracked(() => {
      this.messageService.clear(ROOM_FEEDBACK_TOAST_KEY);

      if (!primaryMessage) {
        return;
      }

      this.messageService.addAll([this.toToastMessage(primaryMessage)]);
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

    for (const [key, blockerKey] of this.suppressedTransientBlockers) {
      if (!currentKeys.has(key) || !currentKeys.has(blockerKey)) {
        this.suppressedTransientBlockers.delete(key);
      }
    }

    this.suppressLowerPriorityTransientMessages(messages);

    const newMessages = messages.filter((message) => {
      const key = this.feedbackKey(message);

      if (this.seenTransientKeys.has(key)) {
        return false;
      }

      return !this.suppressedTransientBlockers.has(key);
    });
    const primaryMessage = this.selectPrimaryFeedback(newMessages);

    if (!primaryMessage) {
      return;
    }
    const primaryKey = this.feedbackKey(primaryMessage);

    this.seenTransientKeys.add(primaryKey);
    this.suppressLowerPriorityTransientMessages(newMessages, primaryKey);

    untracked(() => {
      this.messageService.addAll([this.toToastMessage(primaryMessage)]);
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

  private selectPrimaryFeedback(
    messages: readonly OnlineRoomFeedbackMessageViewModel[],
  ): OnlineRoomFeedbackMessageViewModel | null {
    return messages.reduce<OnlineRoomFeedbackMessageViewModel | null>(
      (primaryMessage, message) => {
        if (!primaryMessage) {
          return message;
        }

        return TONE_PRIORITY[message.tone] > TONE_PRIORITY[primaryMessage.tone]
          ? message
          : primaryMessage;
      },
      null,
    );
  }

  private suppressLowerPriorityTransientMessages(
    messages: readonly OnlineRoomFeedbackMessageViewModel[],
    blockerKey?: string,
  ): void {
    const resolvedBlockerKey =
      blockerKey ??
      this.optionalFeedbackKey(this.selectPrimaryFeedback(messages));

    if (!resolvedBlockerKey) {
      return;
    }

    const blocker = messages.find(
      (message) => this.feedbackKey(message) === resolvedBlockerKey,
    );

    if (!blocker) {
      return;
    }

    for (const message of messages) {
      const key = this.feedbackKey(message);

      if (
        key !== resolvedBlockerKey &&
        TONE_PRIORITY[message.tone] <= TONE_PRIORITY[blocker.tone] &&
        !this.seenTransientKeys.has(key)
      ) {
        this.suppressedTransientBlockers.set(key, resolvedBlockerKey);
      }
    }
  }

  private optionalFeedbackKey(
    message: OnlineRoomFeedbackMessageViewModel | null,
  ): string | null {
    return message ? this.feedbackKey(message) : null;
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
