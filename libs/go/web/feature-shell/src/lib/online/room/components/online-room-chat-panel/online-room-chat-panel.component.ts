import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ChatMessage } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-online-room-chat-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section
      data-testid="room-chat-panel"
      class="flex h-full min-h-[22rem] flex-col rounded-[1.35rem] border border-white/10 bg-slate-950/84 p-4 text-stone-100 shadow-xl shadow-slate-950/20"
    >
      <p
        class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400"
      >
        {{ i18n.t('room.chat.title') }}
      </p>

      <div class="chat-feed mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-1">
        @if (messages().length > 0) {
          @for (message of messages(); track message.id) {
            <article
              class="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-semibold text-stone-50">
                  {{ message.displayName }}
                </p>
                <p
                  class="text-[0.7rem] uppercase tracking-[0.16em] text-stone-400"
                >
                  {{
                    message.sentAt
                      | date: 'shortTime' : undefined : i18n.locale()
                  }}
                </p>
              </div>
              <p class="mt-2 text-sm leading-6 text-stone-200">
                {{ message.message }}
              </p>
            </article>
          }
        } @else {
          <p
            class="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-stone-400"
          >
            {{ i18n.t('room.chat.empty') }}
          </p>
        }
      </div>

      <form
        class="mt-4 space-y-3"
        [formGroup]="chatForm()"
        (ngSubmit)="sendRequested.emit()"
      >
        <label
          [for]="chatMessageInputId"
          class="block text-xs font-semibold uppercase tracking-[0.24em] text-stone-400"
        >
          {{ i18n.t('room.chat.message') }}
        </label>
        <textarea
          [id]="chatMessageInputId"
          formControlName="message"
          rows="3"
          data-testid="chat-message-input"
          class="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-stone-50 outline-none transition focus:border-amber-300/50"
          [placeholder]="i18n.t('room.chat.placeholder')"
          [readOnly]="!canSend()"
          (keydown)="onMessageKeydown($event)"
        ></textarea>

        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-stone-400">
            {{ helperText() }}
          </p>

          <button
            type="submit"
            class="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canSend()"
          >
            {{ i18n.t('room.chat.send') }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .chat-feed {
      scrollbar-gutter: stable;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomChatPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly chatForm = input.required<FormGroup>();
  readonly participantId = input<string | null>(null);
  readonly isMuted = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly messages = input.required<readonly ChatMessage[]>();
  readonly helperText = input.required<string>();
  readonly sendRequested = output<void>();

  protected readonly chatMessageInputId = 'room-chat-message';
  protected readonly canSend = computed(
    () => !!this.participantId() && !this.isMuted() && this.realtimeConnected(),
  );

  protected onMessageKeydown(event: KeyboardEvent): void {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing ||
      !this.canSend()
    ) {
      return;
    }

    event.preventDefault();
    this.sendRequested.emit();
  }
}
