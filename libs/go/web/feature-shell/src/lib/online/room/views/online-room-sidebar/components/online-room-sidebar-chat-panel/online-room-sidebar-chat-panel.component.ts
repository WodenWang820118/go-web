import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { ChatMessage, ParticipantSummary } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomChatFormGroup } from '../../../../contracts/online-room-form.contracts';

@Component({
  selector: 'lib-go-online-room-sidebar-chat-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, TextareaModule],
  host: {
    class: 'block min-h-0 flex-1',
  },
  template: `
    <section
      class="go-hosted-panel-light flex h-full min-h-0 flex-col p-4"
      data-testid="room-sidebar-chat"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-xl font-semibold text-stone-950">
            {{ i18n.t('room.chat.title') }}
          </h2>

          <div class="mt-3 flex flex-wrap gap-2">
            <div
              class="go-hosted-metric-card"
              data-testid="room-sidebar-chat-metric"
              aria-label="{{ onlineCount() }} {{
                i18n.t('common.status.online')
              }}"
            >
              <span class="go-hosted-metric-card__count">{{
                onlineCount()
              }}</span>
              <span
                class="go-hosted-metric-card__dot go-hosted-metric-card__dot--online"
                aria-hidden="true"
              ></span>
              <span class="go-hosted-metric-card__label">
                {{ i18n.t('common.status.online') }}
              </span>
            </div>
            <div
              class="go-hosted-metric-card"
              data-testid="room-sidebar-chat-metric"
              aria-label="{{ spectatorCount() }} {{
                i18n.t('common.role.spectator')
              }}"
            >
              <span class="go-hosted-metric-card__count">{{
                spectatorCount()
              }}</span>
              <span
                class="go-hosted-metric-card__dot go-hosted-metric-card__dot--spectator"
                aria-hidden="true"
              ></span>
              <span class="go-hosted-metric-card__label">
                {{ i18n.t('common.role.spectator') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex min-h-0 flex-1 flex-col gap-4">
        <div
          #chatList
          class="go-hosted-scroll grid min-h-0 flex-1 gap-3 overflow-auto rounded-[1rem] border border-stone-900/10 bg-white/78 p-2 pr-1 shadow-[inset_0_0_0_1px_rgba(77,62,40,0.03)]"
          data-testid="room-sidebar-chat-list"
        >
          @if (messages().length > 0) {
            @for (message of messages(); track message.id) {
              <article
                class="rounded-[1rem] border border-stone-900/10 bg-white/80 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(77,62,40,0.05)]"
                [attr.data-testid]="'room-sidebar-chat-message-' + message.id"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="truncate text-sm font-semibold text-stone-950">
                    {{ message.displayName }}
                  </p>
                  <p
                    class="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500"
                  >
                    {{
                      message.sentAt
                        | date: 'shortTime' : undefined : i18n.locale()
                    }}
                  </p>
                </div>
                <p class="mt-2 text-sm leading-6 text-stone-800">
                  {{ message.message }}
                </p>
              </article>
            }
          } @else {
            <p
              class="grid min-h-[6.5rem] place-items-center rounded-[1rem] border border-dashed border-stone-900/15 px-4 py-6 text-center text-sm leading-6 text-stone-700"
              data-testid="room-sidebar-chat-empty"
            >
              {{ i18n.t('room.chat.empty') }}
            </p>
          }
        </div>

        <form
          class="grid gap-3 rounded-[1rem] border border-stone-900/10 bg-white/88 p-3 shadow-[inset_0_0_0_1px_rgba(77,62,40,0.04)]"
          data-testid="room-sidebar-chat-composer"
          [formGroup]="chatForm()"
          (ngSubmit)="sendRequested.emit()"
        >
          <label
            [for]="chatMessageInputId"
            class="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            <span>{{ i18n.t('room.chat.message') }}</span>
            <textarea
              [id]="chatMessageInputId"
              pTextarea
              formControlName="message"
              rows="3"
              data-testid="chat-message-input"
              class="go-hosted-textarea"
              [placeholder]="i18n.t('room.chat.placeholder')"
              [readOnly]="!canSend()"
              (keydown)="onMessageKeydown($event)"
            ></textarea>
          </label>

          <div
            class="flex items-center gap-3"
            [class.justify-end]="!helperText()"
          >
            @if (helperText()) {
              <p class="flex-1 text-sm leading-6 text-stone-700">
                {{ helperText() }}
              </p>
            }

            <button
              pButton
              type="submit"
              class="go-hosted-button-primary"
              [disabled]="!canSend()"
            >
              {{ i18n.t('room.chat.send') }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarChatPanelComponent implements AfterViewChecked {
  protected readonly i18n = inject(GoI18nService);
  private readonly chatList = viewChild<ElementRef<HTMLElement>>('chatList');
  private lastAutoScrolledMessageId: string | null = null;

  readonly chatForm = input.required<OnlineRoomChatFormGroup>();
  readonly participantId = input<string | null>(null);
  readonly isMuted = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly participants = input.required<readonly ParticipantSummary[]>();
  readonly messages = input.required<readonly ChatMessage[]>();
  readonly helperText = input.required<string>();

  readonly sendRequested = output<void>();

  protected readonly chatMessageInputId = 'room-chat-message';
  protected readonly canSend = computed(
    () => !!this.participantId() && !this.isMuted() && this.realtimeConnected(),
  );
  protected readonly onlineCount = computed(
    () =>
      this.participants().filter((participant) => participant.online).length,
  );
  protected readonly spectatorCount = computed(
    () => this.participants().filter((participant) => !participant.seat).length,
  );

  ngAfterViewChecked(): void {
    const messages = this.messages();
    const latestMessageId =
      messages.length > 0 ? messages[messages.length - 1]?.id ?? null : null;

    if (!latestMessageId || latestMessageId === this.lastAutoScrolledMessageId) {
      return;
    }

    this.lastAutoScrolledMessageId = latestMessageId;
    this.scrollChatToBottom();
  }

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

  private scrollChatToBottom(): void {
    const chatList = this.chatList()?.nativeElement;

    if (!chatList) {
      return;
    }

    chatList.scrollTop = chatList.scrollHeight;
  }
}
