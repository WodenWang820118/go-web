import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { vi } from 'vitest';
import { OnlineRoomFeedbackMessageViewModel } from '../../../../contracts/online-room-view.contracts';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { OnlineRoomPageViewStateService } from '../online-room-page-view-state/online-room-page-view-state.service';
import {
  OnlineRoomPageFeedbackService,
  ROOM_FEEDBACK_TOAST_KEY,
} from './online-room-page-feedback.service';

describe('OnlineRoomPageFeedbackService', () => {
  let roomFeedbackMessages: ReturnType<
    typeof signal<readonly OnlineRoomFeedbackMessageViewModel[]>
  >;
  let addAll: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let clearTransientMessages: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    roomFeedbackMessages = signal<
      readonly OnlineRoomFeedbackMessageViewModel[]
    >([]);
    addAll = vi.fn();
    clear = vi.fn();
    clearTransientMessages = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        OnlineRoomPageFeedbackService,
        {
          provide: OnlineRoomPageViewStateService,
          useValue: {
            roomFeedbackMessages,
          },
        },
        {
          provide: OnlineRoomService,
          useValue: {
            clearTransientMessages,
          },
        },
        {
          provide: MessageService,
          useValue: {
            addAll,
            clear,
          },
        },
      ],
    });

    TestBed.inject(OnlineRoomPageFeedbackService);
    TestBed.flushEffects();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('emits a closable error toast once and clears transient room feedback', () => {
    setFeedback([
      feedbackMessage({
        tone: 'error',
        lifetime: 'transient',
        message: 'Join failed',
      }),
    ]);
    setFeedback([
      feedbackMessage({
        tone: 'error',
        lifetime: 'transient',
        message: 'Join failed',
      }),
    ]);

    expect(addAll).toHaveBeenCalledTimes(1);
    expect(firstToast()).toMatchObject({
      key: ROOM_FEEDBACK_TOAST_KEY,
      severity: 'error',
      detail: 'Join failed',
      closable: true,
      sticky: false,
      life: 6000,
    });
    expect(clearTransientMessages).toHaveBeenCalledTimes(1);
  });

  it('allows a transient toast to reappear after the source message disappears', () => {
    setFeedback([
      feedbackMessage({
        tone: 'notice',
        lifetime: 'transient',
        message: 'Seat updated',
      }),
    ]);
    setFeedback([]);
    setFeedback([
      feedbackMessage({
        tone: 'notice',
        lifetime: 'transient',
        message: 'Seat updated',
      }),
    ]);

    expect(addAll).toHaveBeenCalledTimes(2);
    expect(firstToast(1)).toMatchObject({
      key: ROOM_FEEDBACK_TOAST_KEY,
      severity: 'info',
      detail: 'Seat updated',
      closable: true,
      sticky: false,
      life: 4500,
    });
    expect(clearTransientMessages).toHaveBeenCalledTimes(2);
  });

  it('keeps active warning feedback sticky and clears it when the state resolves', () => {
    setFeedback([
      feedbackMessage({
        tone: 'warning',
        lifetime: 'stateful',
        message: 'Realtime unavailable',
      }),
    ]);
    setFeedback([
      feedbackMessage({
        tone: 'warning',
        lifetime: 'stateful',
        message: 'Realtime unavailable',
      }),
    ]);
    setFeedback([]);

    expect(clear).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenNthCalledWith(1, ROOM_FEEDBACK_TOAST_KEY);
    expect(firstToast()).toMatchObject({
      key: ROOM_FEEDBACK_TOAST_KEY,
      severity: 'warn',
      detail: 'Realtime unavailable',
      closable: true,
      sticky: true,
    });
    expect(firstToast().life).toBeUndefined();
    expect(addAll).toHaveBeenCalledTimes(1);
    expect(clearTransientMessages).not.toHaveBeenCalled();
  });

  it('re-toasts a stateful warning after it disappears and returns', () => {
    const warning = feedbackMessage({
      tone: 'warning',
      lifetime: 'stateful',
      message: 'Realtime unavailable',
    });

    setFeedback([warning]);
    setFeedback([]);
    setFeedback([warning]);

    expect(clear).toHaveBeenCalledTimes(3);
    expect(addAll).toHaveBeenCalledTimes(2);
    expect(firstToast(1)).toMatchObject({
      detail: 'Realtime unavailable',
      sticky: true,
    });
  });

  it('surfaces rematch-blocked feedback as a sticky closable warning', () => {
    setFeedback([
      feedbackMessage({
        tone: 'warning',
        lifetime: 'stateful',
        message: 'Rematch blocked until a seat changes.',
      }),
    ]);

    expect(firstToast()).toMatchObject({
      severity: 'warn',
      detail: 'Rematch blocked until a seat changes.',
      closable: true,
      sticky: true,
    });
  });

  it('shows only the primary stateful warning when multiple stateful messages are active', () => {
    setFeedback([
      feedbackMessage({
        tone: 'warning',
        lifetime: 'stateful',
        message: 'Realtime unavailable',
      }),
      feedbackMessage({
        tone: 'warning',
        lifetime: 'stateful',
        message: 'Rematch blocked until a seat changes.',
      }),
    ]);

    expect(toastBatch()).toHaveLength(1);
    // Equal-priority stateful warnings keep the existing array-order tie-break.
    expect(firstToast()).toMatchObject({
      detail: 'Realtime unavailable',
      sticky: true,
    });
  });

  it('chooses the highest-priority stateful message when stateful tones differ', () => {
    setFeedback([
      feedbackMessage({
        tone: 'warning',
        lifetime: 'stateful',
        message: 'Realtime unavailable',
      }),
      feedbackMessage({
        tone: 'error',
        lifetime: 'stateful',
        message: 'Room unavailable',
      }),
    ]);

    expect(toastBatch()).toHaveLength(1);
    expect(firstToast()).toMatchObject({
      severity: 'error',
      detail: 'Room unavailable',
      sticky: true,
    });
  });

  it('shows the next stateful message when the primary stateful message clears', () => {
    const warning = feedbackMessage({
      tone: 'warning',
      lifetime: 'stateful',
      message: 'Realtime unavailable',
    });
    const error = feedbackMessage({
      tone: 'error',
      lifetime: 'stateful',
      message: 'Room unavailable',
    });

    setFeedback([error, warning]);
    setFeedback([warning]);

    expect(clear).toHaveBeenCalledTimes(2);
    expect(addAll).toHaveBeenCalledTimes(2);
    expect(firstToast()).toMatchObject({
      detail: 'Room unavailable',
    });
    expect(firstToast(1)).toMatchObject({
      detail: 'Realtime unavailable',
    });
  });

  it('emits only the highest-priority transient toast in a single feedback cycle', () => {
    setFeedback([
      feedbackMessage({
        tone: 'notice',
        lifetime: 'transient',
        message: 'Seat updated',
      }),
      feedbackMessage({
        tone: 'error',
        lifetime: 'transient',
        message: 'Join failed',
      }),
    ]);

    expect(addAll).toHaveBeenCalledTimes(1);
    expect(toastBatch()).toHaveLength(1);
    expect(firstToast()).toMatchObject({
      severity: 'error',
      detail: 'Join failed',
      sticky: false,
    });
    expect(clearTransientMessages).toHaveBeenCalledTimes(1);
  });

  it('keeps the first transient message when transient priorities tie', () => {
    setFeedback([
      feedbackMessage({
        tone: 'notice',
        lifetime: 'transient',
        message: 'Seat updated',
      }),
      feedbackMessage({
        tone: 'notice',
        lifetime: 'transient',
        message: 'Room copied',
      }),
    ]);

    expect(addAll).toHaveBeenCalledTimes(1);
    expect(toastBatch()).toHaveLength(1);
    expect(firstToast()).toMatchObject({
      detail: 'Seat updated',
    });
  });

  it('does not emit suppressed transient messages on the next effect trigger', () => {
    const messages = [
      feedbackMessage({
        tone: 'notice',
        lifetime: 'transient',
        message: 'Seat updated',
      }),
      feedbackMessage({
        tone: 'error',
        lifetime: 'transient',
        message: 'Join failed',
      }),
    ];

    setFeedback(messages);
    setFeedback([...messages]);

    expect(addAll).toHaveBeenCalledTimes(1);
    expect(firstToast()).toMatchObject({
      detail: 'Join failed',
    });
    expect(clearTransientMessages).toHaveBeenCalledTimes(1);
  });

  it('allows a suppressed transient toast to appear after its higher-priority blocker clears', () => {
    const notice = feedbackMessage({
      tone: 'notice',
      lifetime: 'transient',
      message: 'Seat updated',
    });
    const error = feedbackMessage({
      tone: 'error',
      lifetime: 'transient',
      message: 'Join failed',
    });

    setFeedback([notice, error]);
    setFeedback([notice]);

    expect(addAll).toHaveBeenCalledTimes(2);
    expect(firstToast()).toMatchObject({
      detail: 'Join failed',
    });
    expect(firstToast(1)).toMatchObject({
      detail: 'Seat updated',
    });
    expect(clearTransientMessages).toHaveBeenCalledTimes(2);
  });

  it('limits stateful and transient batches independently when both lifetimes are present', () => {
    setFeedback([
      feedbackMessage({
        tone: 'warning',
        lifetime: 'stateful',
        message: 'Realtime unavailable',
      }),
      feedbackMessage({
        tone: 'notice',
        lifetime: 'transient',
        message: 'Seat updated',
      }),
      feedbackMessage({
        tone: 'error',
        lifetime: 'transient',
        message: 'Join failed',
      }),
    ]);

    expect(addAll).toHaveBeenCalledTimes(2);
    expect(toastBatch()).toHaveLength(1);
    expect(toastBatch(1)).toHaveLength(1);
    expect(firstToast()).toMatchObject({
      detail: 'Realtime unavailable',
      sticky: true,
    });
    expect(firstToast(1)).toMatchObject({
      detail: 'Join failed',
      sticky: false,
    });
  });

  it('clears room feedback toasts on destroy', () => {
    clear.mockClear();

    TestBed.resetTestingModule();

    expect(clear).toHaveBeenCalledWith(ROOM_FEEDBACK_TOAST_KEY);
  });

  it('does not emit a toast when the source suppresses auto-start notices', () => {
    setFeedback([]);

    expect(addAll).not.toHaveBeenCalled();
    expect(clearTransientMessages).not.toHaveBeenCalled();
  });

  function setFeedback(
    messages: readonly OnlineRoomFeedbackMessageViewModel[],
  ): void {
    roomFeedbackMessages.set(messages);
    TestBed.flushEffects();
  }

  function firstToast(callIndex = 0): ToastMessageOptions {
    return toastBatch(callIndex)[0];
  }

  function toastBatch(callIndex = 0): ToastMessageOptions[] {
    const call = addAll.mock.calls[callIndex] as [ToastMessageOptions[]];

    if (!call) {
      throw new Error(
        `addAll call[${callIndex}] does not exist; total calls: ${addAll.mock.calls.length}`,
      );
    }

    return call[0];
  }

  function feedbackMessage(
    options: Pick<
      OnlineRoomFeedbackMessageViewModel,
      'lifetime' | 'message' | 'tone'
    >,
  ): OnlineRoomFeedbackMessageViewModel {
    return {
      ...options,
      closable: true,
    };
  }
});
