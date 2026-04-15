import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { HostedMatchSnapshot, ParticipantSummary } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameStatusChipComponent, StoneBadgeComponent } from '@gx/go/ui';
import { OnlineRoomSeatViewModel } from '../online-room-page.models';

@Component({
  selector: 'lib-go-online-room-roster-panel',
  standalone: true,
  imports: [GameStatusChipComponent, StoneBadgeComponent],
  template: `
    <section
      class="rounded-[1.35rem] border border-white/10 bg-slate-950/84 p-4 text-stone-100 shadow-xl shadow-slate-950/20"
      data-testid="room-roster-panel"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/70">
            {{ i18n.t('room.participants.seats') }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-stone-50">
            {{ i18n.t('room.participants.players_and_spectators') }}
          </h2>
        </div>

        @if (match()) {
          <lib-go-game-status-chip
            [phase]="match()!.state.phase"
            [currentPlayer]="match()!.state.nextPlayer"
            [result]="match()!.state.result"
          />
        }
      </div>

      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        @for (seat of seats(); track seat.color) {
          <div
            class="rounded-[1.1rem] border border-white/10 bg-white/5 px-3 py-3"
            [attr.data-testid]="'seat-' + seat.color"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <lib-go-stone-badge [color]="seat.color" />
                <div>
                  <p class="text-sm font-semibold text-stone-50">
                    {{ i18n.playerLabel(seat.color) }}
                  </p>
                  <p class="text-xs uppercase tracking-[0.2em] text-stone-400">
                    {{ seat.occupant?.displayName ?? i18n.t('room.participants.open_seat') }}
                  </p>
                </div>
              </div>

              @if (seat.isViewerSeat && canChangeSeats()) {
                <button
                  type="button"
                  class="rounded-full border border-white/15 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  [attr.data-testid]="'release-' + seat.color"
                  [disabled]="!realtimeConnected()"
                  (click)="releaseSeatRequested.emit()"
                >
                  {{ i18n.t('room.participants.release') }}
                </button>
              } @else if (seat.canClaim) {
                <button
                  type="button"
                  class="rounded-full bg-amber-300 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                  [attr.data-testid]="'claim-' + seat.color"
                  [disabled]="!realtimeConnected()"
                  (click)="claimSeatRequested.emit(seat.color)"
                >
                  {{ i18n.t('room.participants.claim') }}
                </button>
              }
            </div>
          </div>
        }
      </div>

      <div class="mt-5 flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          {{ i18n.t('room.participants.players_and_spectators') }}
        </p>
        <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-stone-300">
          {{ participants().length }}
        </span>
      </div>

      <div class="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
        @for (participant of participants(); track participant.participantId) {
          <div class="rounded-[1.1rem] border border-white/10 bg-white/5 px-3 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  @if (participant.seat) {
                    <lib-go-stone-badge [color]="participant.seat" />
                  }
                  <p class="truncate text-sm font-semibold text-stone-50">
                    {{ participant.displayName }}
                  </p>
                </div>
                <div class="mt-2 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-stone-300">
                  <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    {{ participantRoleLabel(participant) }}
                  </span>
                  <span
                    class="rounded-full border px-2 py-1"
                    [class.border-emerald-300/30]="participant.online"
                    [class.bg-emerald-400/10]="participant.online"
                    [class.text-emerald-100]="participant.online"
                    [class.border-white/10]="!participant.online"
                    [class.bg-white/5]="!participant.online"
                    [class.text-stone-300]="!participant.online"
                  >
                    {{ participantPresenceLabel(participant) }}
                  </span>
                  @if (participant.muted) {
                    <span class="rounded-full border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-rose-100">
                      {{ i18n.t('common.status.muted') }}
                    </span>
                  }
                </div>
              </div>

              @if (isHost() && !participant.isHost) {
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-white/15 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    [disabled]="!realtimeConnected()"
                    (click)="participant.muted ? unmuteParticipantRequested.emit(participant.participantId) : muteParticipantRequested.emit(participant.participantId)"
                  >
                    {{
                      participant.muted
                        ? i18n.t('room.participants.unmute')
                        : i18n.t('room.participants.mute')
                    }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-rose-300/30 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-200/50 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                    [disabled]="!realtimeConnected()"
                    (click)="kickParticipantRequested.emit(participant.participantId)"
                  >
                    {{ i18n.t('room.participants.kick') }}
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>

      @if (match() && match()!.state.phase !== 'finished') {
        <div class="mt-5 border-t border-white/10 pt-4">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
            {{ i18n.t('room.participants.match_actions') }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              [disabled]="!canPass() || !realtimeConnected()"
              (click)="passRequested.emit()"
            >
              {{ i18n.t('common.move.pass') }}
            </button>
            <button
              type="button"
              class="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              [disabled]="!canResign() || !realtimeConnected()"
              (click)="resignRequested.emit()"
            >
              {{ i18n.t('common.move.resign') }}
            </button>
            <button
              type="button"
              class="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              [disabled]="!canFinalizeScoring() || !realtimeConnected()"
              (click)="finalizeScoringRequested.emit()"
            >
              {{ i18n.t('room.participants.finalize_score') }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomRosterPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly participants = input.required<readonly ParticipantSummary[]>();
  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly isHost = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly canChangeSeats = input.required<boolean>();
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly canPass = input.required<boolean>();
  readonly canResign = input.required<boolean>();
  readonly canFinalizeScoring = input.required<boolean>();

  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();
  readonly passRequested = output<void>();
  readonly resignRequested = output<void>();
  readonly finalizeScoringRequested = output<void>();
  readonly muteParticipantRequested = output<string>();
  readonly unmuteParticipantRequested = output<string>();
  readonly kickParticipantRequested = output<string>();

  protected participantRoleLabel(participant: ParticipantSummary): string {
    return participant.isHost
      ? this.i18n.t('common.role.host')
      : participant.seat
        ? this.i18n.t(`common.seat.${participant.seat}`)
        : this.i18n.t('common.role.spectator');
  }

  protected participantPresenceLabel(participant: ParticipantSummary): string {
    return participant.online
      ? this.i18n.t('common.status.online')
      : this.i18n.t('common.status.offline');
  }
}
