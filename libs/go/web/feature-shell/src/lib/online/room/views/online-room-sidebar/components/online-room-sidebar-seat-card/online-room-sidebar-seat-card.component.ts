import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { StoneBadgeComponent } from '@gx/go/ui';
import { OnlineRoomSeatViewModel } from '../../../../online-room-page.models';

@Component({
  selector: 'lib-go-online-room-sidebar-seat-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, StoneBadgeComponent],
  template: `
    <article
      class="go-hosted-panel-dark-soft border p-3"
      [ngClass]="
        isActive()
          ? 'border-amber-300/60 ring-1 ring-amber-300/25'
          : 'border-white/10'
      "
      [attr.data-testid]="'room-player-' + seat().color"
    >
      <div class="flex items-start gap-3">
        <div
          class="grid h-16 w-16 min-w-16 place-items-center rounded-[1rem] bg-[radial-gradient(circle_at_30%_25%,_rgba(255,200,120,0.45),_transparent_38%),linear-gradient(180deg,_#f0a33d,_#ac5a18)] text-center text-[1.35rem] font-extrabold text-amber-950"
          aria-hidden="true"
        >
          <span>{{ avatarInitial() }}</span>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate text-base font-semibold text-stone-50">
              {{ seatDisplayName() }}
            </p>
            <lib-go-stone-badge [color]="seat().color" />
          </div>

          <div
            class="mt-3 flex items-center gap-2 overflow-hidden"
            [attr.data-testid]="'room-player-' + seat().color + '-status'"
          >
            <span
              class="go-hosted-pill-subtle inline-flex shrink-0 items-center justify-center"
              [attr.data-testid]="'room-player-' + seat().color + '-presence'"
            >
              {{ seatPresenceLabel() }}
            </span>
            @if (captureCountLabel()) {
              <span
                class="go-hosted-pill-subtle inline-flex shrink-0 items-center justify-center"
                [attr.data-testid]="'room-player-' + seat().color + '-captures'"
              >
                {{ captureCountLabel() }}
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
          <span class="font-mono text-base font-extrabold tracking-[0.08em]"
            >--:--</span
          >
          <span
            class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-stone-300"
          >
            {{ i18n.t('room.sidebar.decorative_clock') }}
          </span>
        </div>

        @if (seat().isViewerSeat && canChangeSeats()) {
          <button
            pButton
            type="button"
            class="go-hosted-button-secondary"
            [attr.data-testid]="'release-' + seat().color"
            [disabled]="!realtimeConnected()"
            (click)="releaseSeatRequested.emit()"
          >
            {{ i18n.t('room.participants.release') }}
          </button>
        } @else if (seat().canClaim) {
          <button
            pButton
            type="button"
            class="go-hosted-button-primary"
            [attr.data-testid]="'claim-' + seat().color"
            [disabled]="!realtimeConnected()"
            (click)="claimSeatRequested.emit(seat().color)"
          >
            {{ i18n.t('room.participants.claim') }}
          </button>
        }
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarSeatCardComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly seat = input.required<OnlineRoomSeatViewModel>();
  readonly isActive = input.required<boolean>();
  readonly canChangeSeats = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly captureCountLabel = input<string | null>(null);

  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();

  protected seatDisplayName(): string {
    return (
      this.seat().occupant?.displayName ??
      this.i18n.t('room.participants.open_seat')
    );
  }

  protected avatarInitial(): string {
    const label =
      this.seat().occupant?.displayName ?? this.i18n.playerLabel(this.seat().color);
    return label.trim().charAt(0).toUpperCase() || '?';
  }

  protected seatPresenceLabel(): string {
    const occupant = this.seat().occupant;

    if (!occupant) {
      return this.i18n.t('room.participants.open_seat');
    }

    return occupant.online
      ? this.i18n.t('common.status.online')
      : this.i18n.t('common.status.offline');
  }
}
