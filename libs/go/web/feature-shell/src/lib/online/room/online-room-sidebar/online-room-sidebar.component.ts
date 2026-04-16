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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, StoneBadgeComponent],
  template: `
    <aside class="room-sidebar" data-testid="room-sidebar">
      @if (roomMessages().length > 0) {
        <div class="room-sidebar__messages">
          @for (item of roomMessages(); track item.testId) {
            <p
              class="room-sidebar__message"
              [class.room-sidebar__message--error]="item.tone === 'error'"
              [class.room-sidebar__message--notice]="item.tone === 'notice'"
              [class.room-sidebar__message--warning]="item.tone === 'warning'"
              [attr.data-testid]="item.testId"
            >
              {{ item.message }}
            </p>
          }
        </div>
      }

      @if (!participantId()) {
        <section class="room-sidebar__identity">
          <p class="room-sidebar__eyebrow">{{ i18n.t('room.participants.join_room') }}</p>
          <h2 class="room-sidebar__section-title">{{ joinCardTitle() }}</h2>
          <p class="room-sidebar__section-copy">{{ joinCardDescription() }}</p>

          <form
            class="room-sidebar__join-form"
            data-testid="join-room-form"
            [formGroup]="joinForm()"
            (ngSubmit)="joinRequested.emit()"
          >
            <label [for]="joinDisplayNameInputId" class="room-sidebar__label">
              {{ i18n.t('room.participants.display_name') }}
            </label>
            <input
              [id]="joinDisplayNameInputId"
              formControlName="displayName"
              maxlength="24"
              class="room-sidebar__input"
            />

            <button
              type="submit"
              class="room-sidebar__primary-action"
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

      <section class="room-sidebar__players">
        @for (seat of seats(); track seat.color) {
          <article
            class="player-card"
            [class.player-card--active]="isActiveSeat(seat.color)"
            [attr.data-testid]="'room-player-' + seat.color"
          >
            <div class="player-card__main">
              <div class="player-card__avatar" aria-hidden="true">
                <span class="player-card__avatar-label">
                  {{ avatarInitial(seat) }}
                </span>
                <span class="player-card__decorative-tag">
                  {{ i18n.t('room.sidebar.decorative_avatar') }}
                </span>
              </div>

              <div class="player-card__identity">
                <div class="player-card__name-line">
                  <p class="player-card__name">{{ seatDisplayName(seat) }}</p>
                  <lib-go-stone-badge [color]="seat.color" />
                </div>
                <p class="player-card__seat">{{ i18n.playerLabel(seat.color) }}</p>
                <div class="player-card__chips">
                  <span class="player-card__chip">
                    {{ seatPresenceLabel(seat) }}
                  </span>
                  @if (captureLabel(seat.color)) {
                    <span class="player-card__chip player-card__chip--subtle">
                      {{ captureLabel(seat.color) }}
                    </span>
                  }
                </div>
              </div>
            </div>

            <div class="player-card__footer">
              <div class="player-card__clock" aria-hidden="true">
                <span class="player-card__clock-time">--:--</span>
                <span class="player-card__decorative-tag">
                  {{ i18n.t('room.sidebar.decorative_clock') }}
                </span>
              </div>

              @if (seat.isViewerSeat && canChangeSeats()) {
                <button
                  type="button"
                  class="player-card__action player-card__action--secondary"
                  [attr.data-testid]="'release-' + seat.color"
                  [disabled]="!realtimeConnected()"
                  (click)="releaseSeatRequested.emit()"
                >
                  {{ i18n.t('room.participants.release') }}
                </button>
              } @else if (seat.canClaim) {
                <button
                  type="button"
                  class="player-card__action"
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
        <section class="room-sidebar__rematch" data-testid="room-sidebar-rematch">
          <p class="room-sidebar__eyebrow">{{ i18n.t('room.rematch.eyebrow') }}</p>
          <h2 class="room-sidebar__section-title">{{ i18n.t('room.rematch.title') }}</h2>
          <p class="room-sidebar__section-copy">
            {{
              canRespondToRematch()
                ? i18n.t('room.rematch.description.player')
                : i18n.t('room.rematch.description.spectator')
            }}
          </p>

          <div class="room-sidebar__rematch-statuses">
            @for (status of rematchStatuses(); track status.color) {
              <div class="room-sidebar__rematch-status">
                <div>
                  <p class="room-sidebar__rematch-name">{{ status.name }}</p>
                  <p class="room-sidebar__rematch-seat">
                    {{ i18n.playerLabel(status.color) }}
                  </p>
                </div>
                <span class="room-sidebar__viewer-tag">
                  {{ i18n.t('room.rematch.response.' + status.response) }}
                </span>
              </div>
            }
          </div>

          @if (canRespondToRematch()) {
            <div class="room-sidebar__rematch-actions">
              <button
                type="button"
                class="room-sidebar__primary-action"
                (click)="acceptRematchRequested.emit()"
              >
                {{ i18n.t('room.rematch.accept') }}
              </button>
              <button
                type="button"
                class="room-sidebar__secondary-action"
                (click)="declineRematchRequested.emit()"
              >
                {{ i18n.t('room.rematch.decline') }}
              </button>
            </div>
          }
        </section>
      }

      <section class="room-sidebar__chat" data-testid="room-sidebar-chat">
        <div class="room-sidebar__chat-header">
          <div class="room-sidebar__chat-heading">
            <h2 class="room-sidebar__section-title room-sidebar__section-title--chat">
              {{ i18n.t('room.chat.title') }}
            </h2>

            <div class="room-sidebar__chat-metrics">
              <span class="room-sidebar__chat-metric">
                <strong>{{ onlineCount() }}</strong>
                <span>{{ i18n.t('common.status.online') }}</span>
              </span>
              <span class="room-sidebar__chat-metric">
                <strong>{{ spectatorCount() }}</strong>
                <span>{{ i18n.t('common.role.spectator') }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="room-sidebar__chat-feed">
          @if (messages().length > 0) {
            @for (message of messages(); track message.id) {
              <article class="room-sidebar__chat-message">
                <div class="room-sidebar__chat-line">
                  <p class="room-sidebar__chat-author">{{ message.displayName }}</p>
                  <p class="room-sidebar__chat-time">
                    {{ message.sentAt | date: 'shortTime' : undefined : i18n.locale() }}
                  </p>
                </div>
                <p class="room-sidebar__chat-copy">{{ message.message }}</p>
              </article>
            }
          } @else {
            <p class="room-sidebar__chat-empty">
              {{ i18n.t('room.chat.empty') }}
            </p>
          }
        </div>

        <form
          class="room-sidebar__chat-form"
          [formGroup]="chatForm()"
          (ngSubmit)="sendRequested.emit()"
        >
          <label [for]="chatMessageInputId" class="room-sidebar__label">
            {{ i18n.t('room.chat.message') }}
          </label>
          <textarea
            [id]="chatMessageInputId"
            formControlName="message"
            rows="3"
            data-testid="chat-message-input"
            class="room-sidebar__textarea"
            [placeholder]="i18n.t('room.chat.placeholder')"
            [readOnly]="!canSend()"
            (keydown)="onMessageKeydown($event)"
          ></textarea>

          <div class="room-sidebar__chat-actions">
            <p class="room-sidebar__helper">
              {{ helperText() }}
            </p>

            <button
              type="submit"
              class="room-sidebar__primary-action"
              [disabled]="!canSend()"
            >
              {{ i18n.t('room.chat.send') }}
            </button>
          </div>
        </form>
      </section>

      <section class="room-sidebar__actions" data-testid="room-sidebar-actions">
        <div class="room-sidebar__action-grid">
          @if (showMatchActions()) {
            <button
              type="button"
              class="room-sidebar__secondary-action"
              [disabled]="!canPass() || !realtimeConnected()"
              (click)="passRequested.emit()"
            >
              {{ i18n.t('common.move.pass') }}
            </button>
            <button
              type="button"
              class="room-sidebar__secondary-action"
              [disabled]="!canResign() || !realtimeConnected()"
              (click)="resignRequested.emit()"
            >
              {{ i18n.t('common.move.resign') }}
            </button>
          }

          <a routerLink="/" class="room-sidebar__back">
            {{ i18n.t('room.page.back_to_lobby') }}
          </a>
        </div>
      </section>
    </aside>
  `,
  styleUrl: './online-room-sidebar.component.css',
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
  protected readonly showMatchActions = computed(
    () => !!this.match() && this.match()!.state.phase !== 'finished'
  );

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
