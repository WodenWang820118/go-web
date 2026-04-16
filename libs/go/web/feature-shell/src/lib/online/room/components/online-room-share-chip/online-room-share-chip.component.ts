import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';

export type OnlineRoomShareChipFeedbackState = 'idle' | 'success' | 'manual';

@Component({
  selector: 'lib-go-online-room-share-chip',
  standalone: true,
  imports: [ButtonModule, ChipModule, InputTextModule],
  templateUrl: './online-room-share-chip.component.html',
  styleUrls: ['./online-room-share-chip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomShareChipComponent {
  private readonly manualUrlInput =
    viewChild<ElementRef<HTMLInputElement>>('manualUrlInput');
  private readonly shareButton =
    viewChild<ElementRef<HTMLButtonElement>>('shareButton');

  readonly shareUrl = input.required<string>();
  readonly shareLabel = input.required<string>();
  readonly copiedLabel = input.required<string>();
  readonly copyAriaLabel = input.required<string>();
  readonly retryAriaLabel = input.required<string>();
  readonly copiedMessage = input.required<string>();
  readonly copyFailedMessage = input.required<string>();
  readonly manualCopyInstruction = input.required<string>();
  readonly manualUrlAriaLabel = input.required<string>();
  readonly dismissLabel = input.required<string>();
  readonly connectionState = input.required<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >();
  readonly connectionLabel = input.required<string>();
  readonly feedbackState = input<OnlineRoomShareChipFeedbackState>('idle');
  protected readonly shareDisabled = computed(() => !this.shareUrl());
  protected readonly shareChipStyleClass = computed(() => {
    if (this.feedbackState() === 'success') {
      return 'room-share-chip__trigger room-share-chip__trigger--success';
    }

    const toneClass =
      this.connectionState() === 'connected'
        ? 'room-share-chip__trigger room-share-chip__trigger--connected'
        : 'room-share-chip__trigger room-share-chip__trigger--warning';

    return toneClass;
  });
  protected readonly shareChipAriaLabel = computed(() => {
    if (this.feedbackState() === 'manual') {
      return this.retryAriaLabel();
    }

    if (this.feedbackState() === 'success') {
      return this.copiedMessage();
    }

    return this.copyAriaLabel();
  });

  readonly copyRequested = output<void>();
  readonly manualFallbackDismissed = output<void>();

  constructor() {
    effect(() => {
      if (this.feedbackState() !== 'manual') {
        return;
      }

      queueMicrotask(() => {
        const input = this.manualUrlInput()?.nativeElement;
        input?.focus();
        input?.select();
      });
    });
  }

  protected activateShareChip(): void {
    if (this.shareDisabled()) {
      return;
    }

    this.copyRequested.emit();
  }

  protected dismissManualFallback(): void {
    this.manualFallbackDismissed.emit();

    queueMicrotask(() => {
      this.shareButton()?.nativeElement.focus();
    });
  }
}
