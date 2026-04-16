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
  template: `
    <section class="flex w-full flex-col items-end gap-2" data-testid="room-share-chip">
      <button
        #shareButton
        type="button"
        class="room-share-chip__button-reset"
        data-testid="room-share-chip-button"
        role="button"
        tabindex="0"
        [disabled]="shareDisabled()"
        [attr.aria-label]="shareChipAriaLabel()"
        [attr.title]="connectionLabel()"
        (click)="activateShareChip()"
      >
        <p-chip [styleClass]="shareChipStyleClass()" [disabled]="shareDisabled()">
          <span
            class="room-share-chip__light"
            [class.room-share-chip__light--success]="feedbackState() === 'success'"
            [class.room-share-chip__light--connected]="
              feedbackState() !== 'success' && connectionState() === 'connected'
            "
            aria-hidden="true"
          ></span>
          <span class="room-share-chip__label">
            {{ feedbackState() === 'success' ? copiedLabel() : shareLabel() }}
          </span>
        </p-chip>
      </button>

      @if (feedbackState() === 'success') {
        <span
          class="sr-only"
          data-testid="room-share-chip-feedback"
          role="status"
          aria-live="polite"
        >
          {{ copiedMessage() }}
        </span>
      }

      @if (feedbackState() === 'manual') {
        <div
          class="go-hosted-surface-warm grid w-full max-w-[17rem] gap-3 p-3 sm:p-3"
          data-testid="room-share-chip-manual"
          role="status"
          aria-live="polite"
          tabindex="-1"
          (keydown.escape)="dismissManualFallback()"
        >
          <p class="text-sm leading-6">
            {{ copyFailedMessage() }}
          </p>

          <input
            #manualUrlInput
            pInputText
            type="text"
            class="go-hosted-input font-mono text-xs"
            data-testid="room-share-chip-manual-url"
            [value]="shareUrl()"
            [attr.aria-label]="manualUrlAriaLabel()"
            readonly
            (keydown.escape)="dismissManualFallback()"
          />

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm leading-6">
              {{ manualCopyInstruction() }}
            </p>

            <button
              pButton
              type="button"
              class="go-hosted-button-secondary whitespace-nowrap"
              data-testid="room-share-chip-manual-dismiss"
              [attr.aria-label]="dismissLabel()"
              (click)="dismissManualFallback()"
              (keydown.escape)="dismissManualFallback()"
            >
              {{ dismissLabel() }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .room-share-chip__button-reset {
      padding: 0;
      border: 0;
      background: transparent;
    }

    .room-share-chip__button-reset:not(:disabled) {
      cursor: pointer;
    }

    .room-share-chip__button-reset:not(:disabled):hover .room-share-chip__trigger,
    .room-share-chip__button-reset:focus-visible .room-share-chip__trigger {
      transform: translateY(-1px);
    }

    .room-share-chip__button-reset:focus-visible {
      outline: none;
    }

    .room-share-chip__button-reset:focus-visible .room-share-chip__trigger {
      outline: 2px solid rgba(220, 184, 93, 0.72);
      outline-offset: 2px;
    }

    .room-share-chip__button-reset:disabled .room-share-chip__trigger {
      cursor: default;
      opacity: 0.92;
      transform: none;
    }

    .room-share-chip__trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--go-hosted-radius-pill, 999px);
      padding: 0.56rem 0.72rem;
      background:
        linear-gradient(180deg, rgba(29, 38, 49, 0.96), rgba(12, 18, 25, 0.96)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0));
      color: #f4efe2;
      box-shadow: 0 18px 34px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1;
      transition:
        transform 140ms ease,
        opacity 140ms ease,
        border-color 140ms ease,
        background-color 140ms ease;
      user-select: none;
    }

    .room-share-chip__trigger--connected {
      border-color: rgba(74, 222, 128, 0.28);
    }

    .room-share-chip__trigger--success {
      border-color: rgba(110, 231, 183, 0.42);
      background:
        linear-gradient(180deg, rgba(17, 66, 53, 0.96), rgba(10, 36, 30, 0.96)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0));
      color: #eafff5;
    }

    .room-share-chip__trigger--warning {
      border-color: rgba(251, 191, 36, 0.24);
    }

    .room-share-chip__trigger.p-disabled {
      cursor: default;
      opacity: 0.92;
      transform: none;
    }

    .room-share-chip__light {
      width: 0.52rem;
      height: 0.52rem;
      border-radius: 999px;
      background: #fbbf24;
      box-shadow: 0 0 1rem rgba(251, 191, 36, 0.55);
      flex: none;
    }

    .room-share-chip__light--connected {
      background: #4ade80;
      box-shadow: 0 0 1rem rgba(74, 222, 128, 0.62);
    }

    .room-share-chip__light--success {
      background: #6ee7b7;
      box-shadow: 0 0 1rem rgba(110, 231, 183, 0.68);
    }

    .room-share-chip__label {
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomShareChipComponent {
  private readonly manualUrlInput = viewChild<ElementRef<HTMLInputElement>>('manualUrlInput');
  private readonly shareButton = viewChild<ElementRef<HTMLButtonElement>>('shareButton');

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
