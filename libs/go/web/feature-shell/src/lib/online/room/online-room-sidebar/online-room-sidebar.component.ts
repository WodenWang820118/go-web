import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ChatMessage, HostedMatchSnapshot, ParticipantSummary } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { StoneBadgeComponent } from '@gx/go/ui';
import { OnlineRoomSeatViewModel } from '../online-room-page.models';

type OnlineRoomJoinFormGroup = FormGroup<{
  displayName: FormControl<string>;
}>;

type OnlineRoomChatFormGroup = FormGroup<{
  message: FormControl<string>;
}>;

interface OnlineRoomSidebarMessageViewModel {
  readonly tone: 'error' | 'notice' | 'warning';
  readonly message: string;
  readonly testId: string;
}

interface OnlineRoomSidebarRematchStatusViewModel {
  readonly color: PlayerColor;
  readonly name: string;
  readonly response: 'pending' | 'accepted' | 'declined';
  readonly isViewer: boolean;
}

@Component({
  selector: 'lib-go-online-room-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    TagModule,
    StoneBadgeComponent,
  ],
  template: `
    <aside
      class="go-hosted-panel-dark go-hosted-scroll flex h-full min-h-full flex-col gap-3 p-3"
      data-testid="room-sidebar"
    >
      @if (roomMessages().length > 0) {
        <div class="grid gap-2">
          @for (item of roomMessages(); track item.testId) {
            <p-message
              [severity]="messageSeverity(item.tone)"
              [styleClass]="'go-hosted-message ' + messageToneClass(item.tone)"
              [attr.data-testid]="item.testId"
            >
              {{ item.message }}
            </p-message>
          }
        </div>
      }

      @if (!participantId()) {
        <section
          class="go-hosted-panel-dark-soft space-y-3 p-4"
          data-testid="room-sidebar-identity"
        >
          <p class="go-hosted-eyebrow-muted">{{ i18n.t('room.participants.join_room') }}</p>
          <h2 class="text-xl font-semibold text-stone-50">{{ joinCardTitle() }}</h2>
          <p class="text-sm leading-6 text-stone-300/80">{{ joinCardDescription() }}</p>

          <form
            class="mt-2 grid gap-3"
            data-testid="join-room-form"
            [formGroup]="joinForm()"
            (ngSubmit)="joinRequested.emit()"
          >
            <label
              [for]="joinDisplayNameInputId"
              class="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-300/70"
            >
              <span>{{ i18n.t('room.participants.display_name') }}</span>
              <input
                [id]="joinDisplayNameInputId"
                pInputText
                formControlName="displayName"
                maxlength="24"
                class="go-hosted-input"
              />
            </label>

            <button
              pButton
              type="submit"
              class="go-hosted-button-primary justify-center"
              [disabled]="joining()"
            >
              {{
                joining()
                  ? i18n.t('room.participants.joining_room')
                  : i18n.t('room.participants.join_room')
              }}
            </button>
          </form>
        </section>
      }

      <section class="grid gap-3 xl:grid-cols-2" data-testid="room-sidebar-players">
        @for (seat of seats(); track seat.color) {
          <article
            class="go-hosted-panel-dark-soft border p-3"
            [ngClass]="
              isActiveSeat(seat.color)
                ? 'border-amber-300/60 ring-1 ring-amber-300/25'
                : 'border-white/10'
            "
            [attr.data-testid]="'room-player-' + seat.color"
          >
            <div class="flex items-start gap-3">
              <div
                class="grid h-16 w-16 min-w-16 place-items-center rounded-[1rem] bg-[radial-gradient(circle_at_30%_25%,_rgba(255,200,120,0.45),_transparent_38%),linear-gradient(180deg,_#f0a33d,_#ac5a18)] text-center text-[1.35rem] font-extrabold text-amber-950"
                aria-hidden="true"
              >
                <span>{{ avatarInitial(seat) }}</span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate text-base font-semibold text-stone-50">
                    {{ seatDisplayName(seat) }}
                  </p>
                  <lib-go-stone-badge [color]="seat.color" />
                </div>

                <div
                  class="mt-3 flex items-center gap-2 overflow-hidden"
                  [attr.data-testid]="'room-player-' + seat.color + '-status'"
                >
                  <span
                    class="go-hosted-pill-subtle inline-flex shrink-0 items-center justify-center"
                    [attr.data-testid]="'room-player-' + seat.color + '-presence'"
                  >
                    {{ seatPresenceLabel(seat) }}
                  </span>
                  @if (captureLabel(seat.color); as captureCountLabel) {
                    <span
                      class="go-hosted-pill-subtle inline-flex shrink-0 items-center justify-center"
                      [attr.data-testid]="'room-player-' + seat.color + '-captures'"
                    >
                      {{ captureCountLabel }}
                    </span>
                  }
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between gap-3">
              <div
                class="inline-flex min-h-[2.5rem] items-center gap-2 rounded-full bg-black/35 px-3 py-2 text-amber-100"
                aria-hidden="true"
              >
                <span class="font-mono text-base font-extrabold tracking-[0.08em]">--:--</span>
                <span class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-stone-300">
                  {{ i18n.t('room.sidebar.decorative_clock') }}
                </span>
              </div>

              @if (seat.isViewerSeat && canChangeSeats()) {
                <button
                  pButton
                  type="button"
                  class="go-hosted-button-secondary"
                  [attr.data-testid]="'release-' + seat.color"
                  [disabled]="!realtimeConnected()"
                  (click)="releaseSeatRequested.emit()"
                >
                  {{ i18n.t('room.participants.release') }}
                </button>
              } @else if (seat.canClaim) {
                <button
                  pButton
                  type="button"
                  class="go-hosted-button-primary"
                  [attr.data-testid]="'claim-' + seat.color"
                  [disabled]="!realtimeConnected()"
                  (click)="claimSeatRequested.emit(seat.color)"
                >
                  {{ i18n.t('room.participants.claim') }}
                </button>
              }
            </div>
          </article>
        }
      </section>

      @if (showRematch()) {
        <section
          class="go-hosted-panel-dark-soft space-y-3 p-4"
          data-testid="room-sidebar-rematch"
        >
          <p class="go-hosted-eyebrow-muted">{{ i18n.t('room.rematch.eyebrow') }}</p>
          <h2 class="text-xl font-semibold text-stone-50">{{ i18n.t('room.rematch.title') }}</h2>
          <p class="text-sm leading-6 text-stone-300/80">
            {{
              canRespondToRematch()
                ? i18n.t('room.rematch.description.player')
                : i18n.t('room.rematch.description.spectator')
            }}
          </p>

          <div class="grid gap-2">
            @for (status of rematchStatuses(); track status.color) {
              <div
                class="flex items-center justify-between gap-3 rounded-[1rem] bg-white/5 px-3 py-2.5"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-stone-50">{{ status.name }}</p>
                  <p class="text-xs uppercase tracking-[0.16em] text-stone-400">
                    {{ i18n.playerLabel(status.color) }}
                  </p>
                </div>
                <p-tag
                  severity="contrast"
                  [rounded]="true"
                  [value]="i18n.t('room.rematch.response.' + status.response)"
                  styleClass="go-hosted-pill-subtle"
                />
              </div>
            }
          </div>

          @if (canRespondToRematch()) {
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                pButton
                type="button"
                class="go-hosted-button-primary justify-center"
                (click)="acceptRematchRequested.emit()"
              >
                {{ i18n.t('room.rematch.accept') }}
              </button>
              <button
                pButton
                type="button"
                class="go-hosted-button-secondary justify-center"
                (click)="declineRematchRequested.emit()"
              >
                {{ i18n.t('room.rematch.decline') }}
              </button>
            </div>
          }
        </section>
      }

      <section
        class="go-hosted-panel-light flex min-h-0 flex-1 flex-col p-4"
        data-testid="room-sidebar-chat"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-xl font-semibold text-stone-950">{{ i18n.t('room.chat.title') }}</h2>

            <div class="mt-3 flex flex-wrap gap-2">
              <div
                class="go-hosted-metric-card"
                data-testid="room-sidebar-chat-metric"
                aria-label="{{ onlineCount() }} {{ i18n.t('common.status.online') }}"
              >
                <span class="go-hosted-metric-card__count">{{ onlineCount() }}</span>
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
                aria-label="{{ spectatorCount() }} {{ i18n.t('common.role.spectator') }}"
              >
                <span class="go-hosted-metric-card__count">{{ spectatorCount() }}</span>
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

        <div class="mt-4 flex min-h-0 flex-1 flex-col justify-end gap-4">
          <div
            class="go-hosted-scroll grid max-h-[clamp(8rem,32vh,20rem)] min-h-0 gap-3 overflow-auto rounded-[1rem] border border-stone-900/10 bg-white/78 p-2 pr-1 shadow-[inset_0_0_0_1px_rgba(77,62,40,0.03)]"
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
                    <p class="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">
                      {{ message.sentAt | date: 'shortTime' : undefined : i18n.locale() }}
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

            <div class="flex items-center justify-between gap-3">
              <p class="flex-1 text-sm leading-6 text-stone-700">
                {{ helperText() }}
              </p>

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

      <section data-testid="room-sidebar-actions">
        <div class="grid gap-2 md:grid-cols-3">
          @if (showMatchActions()) {
            <button
              pButton
              type="button"
              class="go-hosted-button-secondary justify-center"
              [disabled]="!canPass() || !realtimeConnected()"
              (click)="passRequested.emit()"
            >
              {{ i18n.t('common.move.pass') }}
            </button>
            <button
              pButton
              type="button"
              class="go-hosted-button-secondary justify-center"
              [disabled]="!canResign() || !realtimeConnected()"
              (click)="resignRequested.emit()"
            >
              {{ i18n.t('common.move.resign') }}
            </button>
          }

          <a
            routerLink="/"
            pButton
            class="go-hosted-button-secondary justify-center md:col-span-1"
          >
            {{ i18n.t('room.page.back_to_lobby') }}
          </a>
        </div>
      </section>
    </aside>
  `,
  host: {
    class: 'block min-h-0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly joinForm = input.required<OnlineRoomJoinFormGroup>();
  readonly chatForm = input.required<OnlineRoomChatFormGroup>();
  readonly participantId = input<string | null>(null);
  readonly joining = input.required<boolean>();
  readonly isMuted = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly canChangeSeats = input.required<boolean>();
  readonly joinCardTitle = input.required<string>();
  readonly joinCardDescription = input.required<string>();
  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly participants = input.required<readonly ParticipantSummary[]>();
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly messages = input.required<readonly ChatMessage[]>();
  readonly helperText = input.required<string>();
  readonly roomMessages = input.required<readonly OnlineRoomSidebarMessageViewModel[]>();
  readonly canPass = input.required<boolean>();
  readonly canResign = input.required<boolean>();
  readonly showRematch = input.required<boolean>();
  readonly canRespondToRematch = input.required<boolean>();
  readonly rematchStatuses =
    input.required<readonly OnlineRoomSidebarRematchStatusViewModel[]>();

  readonly joinRequested = output<void>();
  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();
  readonly passRequested = output<void>();
  readonly resignRequested = output<void>();
  readonly acceptRematchRequested = output<void>();
  readonly declineRematchRequested = output<void>();
  readonly sendRequested = output<void>();

  protected readonly joinDisplayNameInputId = 'room-join-display-name';
  protected readonly chatMessageInputId = 'room-chat-message';
  protected readonly canSend = computed(
    () => !!this.participantId() && !this.isMuted() && this.realtimeConnected()
  );
  protected readonly onlineCount = computed(
    () => this.participants().filter(participant => participant.online).length
  );
  protected readonly spectatorCount = computed(
    () => this.participants().filter(participant => !participant.seat).length
  );
  protected readonly showMatchActions = computed(() => {
    const match = this.match();
    return !!match && match.state.phase !== 'finished';
  });

  protected seatDisplayName(seat: OnlineRoomSeatViewModel): string {
    return seat.occupant?.displayName ?? this.i18n.t('room.participants.open_seat');
  }

  protected avatarInitial(seat: OnlineRoomSeatViewModel): string {
    const label = seat.occupant?.displayName ?? this.i18n.playerLabel(seat.color);
    return label.trim().charAt(0).toUpperCase() || '?';
  }

  protected isActiveSeat(color: PlayerColor): boolean {
    return this.match()?.state.phase === 'playing' && this.match()?.state.nextPlayer === color;
  }

  protected seatPresenceLabel(seat: OnlineRoomSeatViewModel): string {
    if (!seat.occupant) {
      return this.i18n.t('room.participants.open_seat');
    }

    return seat.occupant.online
      ? this.i18n.t('common.status.online')
      : this.i18n.t('common.status.offline');
  }

  protected captureLabel(color: PlayerColor): string | null {
    const match = this.match();

    if (!match || match.settings.mode !== 'go') {
      return null;
    }

    return this.i18n.t('ui.match_sidebar.captures', {
      count: match.state.captures[color],
    });
  }

  protected messageSeverity(
    tone: OnlineRoomSidebarMessageViewModel['tone']
  ): 'error' | 'secondary' | 'warn' {
    switch (tone) {
      case 'error':
        return 'error';
      case 'notice':
        return 'secondary';
      default:
        return 'warn';
    }
  }

  protected messageToneClass(tone: OnlineRoomSidebarMessageViewModel['tone']): string {
    switch (tone) {
      case 'error':
        return 'go-hosted-message--error';
      case 'notice':
        return 'go-hosted-message--notice';
      default:
        return 'go-hosted-message--warning';
    }
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
}
