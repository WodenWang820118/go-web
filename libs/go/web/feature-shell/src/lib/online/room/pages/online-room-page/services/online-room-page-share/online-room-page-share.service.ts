import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { from, EMPTY, catchError, take, tap } from 'rxjs';
import { OnlineRoomShareChipViewModel } from '../../../../contracts/online-room-view.contracts';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { OnlineRoomPageViewStateService } from '../online-room-page-view-state/online-room-page-view-state.service';

@Injectable()
export class OnlineRoomPageShareService {
  private readonly onlineRoom = inject(OnlineRoomService);
  private readonly view = inject(OnlineRoomPageViewStateService);
  private readonly destroyRef = inject(DestroyRef);
  private shareCopyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  readonly shareCopyFeedbackState =
    signal<OnlineRoomShareChipViewModel['feedbackState']>('idle');
  readonly shareChip = computed<OnlineRoomShareChipViewModel>(() => ({
    shareUrl: this.onlineRoom.shareUrl(),
    shareLabel: this.view.i18n.t('room.hero.share'),
    copiedLabel: this.view.i18n.t('room.hero.copied'),
    copyAriaLabel: `${this.view.i18n.t('room.hero.copy_link')} · ${this.view.connectionLabel()}`,
    retryAriaLabel: `${this.view.i18n.t('room.hero.retry_copy_link')} · ${this.view.connectionLabel()}`,
    copiedMessage: this.view.i18n.t('room.hero.copy_complete'),
    copyFailedMessage: this.view.i18n.t('room.hero.copy_failed'),
    manualCopyInstruction: this.view.i18n.t(
      'room.hero.copy_manual_instruction',
    ),
    manualUrlAriaLabel: this.view.i18n.t('room.hero.manual_url_label'),
    dismissLabel: this.view.i18n.t('common.action.close'),
    connectionState: this.view.connectionState(),
    connectionLabel: this.view.connectionLabel(),
    feedbackState: this.shareCopyFeedbackState(),
  }));

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.shareCopyFeedbackTimer) {
        clearTimeout(this.shareCopyFeedbackTimer);
      }
    });
  }

  copyShareUrl(): void {
    const shareUrl = this.shareChip().shareUrl;

    if (!shareUrl) {
      this.clearShareCopyFeedback();
      this.onlineRoom.clearTransientMessages();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showShareCopyManualFallback();
      this.onlineRoom.clearTransientMessages();
      return;
    }

    from(navigator.clipboard.writeText(shareUrl))
      .pipe(
        tap(() => {
          this.showShareCopySuccess();
          this.onlineRoom.clearTransientMessages();
        }),
        catchError(() => {
          this.showShareCopyManualFallback();
          this.onlineRoom.clearTransientMessages();
          return EMPTY;
        }),
        take(1),
      )
      .subscribe();
  }

  dismissShareCopyManualFallback(): void {
    this.clearShareCopyFeedback();
  }

  private showShareCopySuccess(): void {
    if (this.shareCopyFeedbackTimer) {
      clearTimeout(this.shareCopyFeedbackTimer);
    }

    this.shareCopyFeedbackState.set('success');
    this.shareCopyFeedbackTimer = setTimeout(() => {
      this.shareCopyFeedbackState.set('idle');
      this.shareCopyFeedbackTimer = null;
    }, 3000);
  }

  private showShareCopyManualFallback(): void {
    if (this.shareCopyFeedbackTimer) {
      clearTimeout(this.shareCopyFeedbackTimer);
      this.shareCopyFeedbackTimer = null;
    }

    this.shareCopyFeedbackState.set('manual');
  }

  private clearShareCopyFeedback(): void {
    if (this.shareCopyFeedbackTimer) {
      clearTimeout(this.shareCopyFeedbackTimer);
      this.shareCopyFeedbackTimer = null;
    }

    this.shareCopyFeedbackState.set('idle');
  }
}
