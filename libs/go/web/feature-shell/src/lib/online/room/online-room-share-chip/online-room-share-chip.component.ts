import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

export type OnlineRoomShareChipFeedbackState = 'idle' | 'success' | 'manual';

@Component({
  selector: 'lib-go-online-room-share-chip',
  standalone: true,
  template: `
    <section class="room-share-chip" data-testid="room-share-chip">
      <button
        #shareButton
        type="button"
        class="room-share-chip__button"
        data-testid="room-share-chip-button"
        [class.room-share-chip__button--connected]="connectionState() === 'connected'"
        [class.room-share-chip__button--warning]="connectionState() !== 'connected'"
        [disabled]="!shareUrl()"
        [attr.aria-label]="feedbackState() === 'manual' ? retryAriaLabel() : copyAriaLabel()"
        [attr.title]="connectionLabel()"
        (click)="copyRequested.emit()"
      >
        <span class="room-share-chip__light" aria-hidden="true"></span>
        <span class="room-share-chip__label">{{ shareLabel() }}</span>
      </button>

      @if (feedbackState() === 'success') {
        <p
          class="room-share-chip__feedback room-share-chip__feedback--success"
          data-testid="room-share-chip-feedback"
          role="status"
          aria-live="polite"
        >
          {{ copiedMessage() }}
        </p>
      }

      @if (feedbackState() === 'manual') {
        <div
          class="room-share-chip__manual"
          data-testid="room-share-chip-manual"
          role="status"
          aria-live="polite"
          tabindex="-1"
          (keydown.escape)="dismissManualFallback()"
        >
          <p class="room-share-chip__manual-copy">
            {{ copyFailedMessage() }}
          </p>

          <input
            #manualUrlInput
            type="text"
            class="room-share-chip__manual-url"
            data-testid="room-share-chip-manual-url"
            [value]="shareUrl()"
            [attr.aria-label]="manualUrlAriaLabel()"
            readonly
            (keydown.escape)="dismissManualFallback()"
          />

          <div class="room-share-chip__manual-footer">
            <p class="room-share-chip__manual-instruction">
              {{ manualCopyInstruction() }}
            </p>

            <button
              type="button"
              class="room-share-chip__dismiss"
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

    .room-share-chip {
      display: grid;
      justify-items: end;
      gap: 0.45rem;
    }

    .room-share-chip__button,
    .room-share-chip__dismiss {
      border: 0;
      border-radius: var(--room-radius-chip, 999px);
      font-weight: 700;
      line-height: 1;
      transition:
        transform 140ms ease,
        opacity 140ms ease,
        border-color 140ms ease,
        background-color 140ms ease;
    }

    .room-share-chip__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.56rem 0.72rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background:
        linear-gradient(180deg, rgba(29, 38, 49, 0.96), rgba(12, 18, 25, 0.96)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0));
      color: #f4efe2;
      box-shadow: 0 18px 34px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }

    .room-share-chip__button:hover:not(:disabled),
    .room-share-chip__dismiss:hover {
      transform: translateY(-1px);
    }

    .room-share-chip__button:disabled {
      cursor: default;
      opacity: 0.92;
      transform: none;
    }

    .room-share-chip__button--connected {
      border-color: rgba(74, 222, 128, 0.28);
    }

    .room-share-chip__button--warning {
      border-color: rgba(251, 191, 36, 0.24);
    }

    .room-share-chip__light {
      width: 0.52rem;
      height: 0.52rem;
      border-radius: 999px;
      background: #fbbf24;
      box-shadow: 0 0 1rem rgba(251, 191, 36, 0.55);
    }

    .room-share-chip__button--connected .room-share-chip__light {
      background: #4ade80;
      box-shadow: 0 0 1rem rgba(74, 222, 128, 0.62);
    }

    .room-share-chip__label {
      font-size: 0.74rem;
      letter-spacing: 0.04em;
    }

    .room-share-chip__feedback,
    .room-share-chip__manual {
      width: min(100%, 17rem);
      border-radius: var(--room-radius-card, 1rem);
      padding: 0.75rem 0.85rem;
      box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);
    }

    .room-share-chip__feedback {
      margin: 0;
      font-size: 0.74rem;
      font-weight: 700;
      line-height: 1.4;
    }

    .room-share-chip__feedback--success {
      border: 1px solid rgba(110, 231, 183, 0.32);
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.24), rgba(6, 95, 70, 0.22));
      color: #d8fff0;
    }

    .room-share-chip__manual {
      display: grid;
      gap: 0.65rem;
      border: 1px solid rgba(248, 205, 137, 0.26);
      background:
        linear-gradient(180deg, rgba(38, 25, 10, 0.95), rgba(25, 18, 8, 0.95)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
      color: #f6ead3;
    }

    .room-share-chip__manual-copy,
    .room-share-chip__manual-instruction {
      margin: 0;
      font-size: 0.74rem;
      line-height: 1.45;
    }

    .room-share-chip__manual-url {
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--room-radius-soft, 0.9rem);
      padding: 0.72rem 0.8rem;
      background: rgba(255, 255, 255, 0.06);
      color: #fff7e6;
      font-size: 0.74rem;
      font-family: 'Consolas', 'SFMono-Regular', monospace;
      outline: none;
    }

    .room-share-chip__manual-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .room-share-chip__dismiss {
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.08);
      color: #fff7e6;
      cursor: pointer;
      white-space: nowrap;
    }

    @media (max-width: 767px) {
      .room-share-chip,
      .room-share-chip__manual {
        justify-items: stretch;
      }

      .room-share-chip__manual,
      .room-share-chip__feedback {
        width: 100%;
      }

      .room-share-chip__manual-footer {
        align-items: stretch;
        flex-direction: column;
      }

      .room-share-chip__dismiss {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomShareChipComponent {
  private readonly manualUrlInput = viewChild<ElementRef<HTMLInputElement>>('manualUrlInput');
  private readonly shareButton = viewChild<ElementRef<HTMLButtonElement>>('shareButton');

  readonly shareUrl = input.required<string>();
  readonly shareLabel = input.required<string>();
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

  protected dismissManualFallback(): void {
    this.manualFallbackDismissed.emit();

    queueMicrotask(() => {
      this.shareButton()?.nativeElement.focus();
    });
  }
}
