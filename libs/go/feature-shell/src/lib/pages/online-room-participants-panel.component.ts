import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HostedMatchSnapshot, ParticipantSummary } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameStatusChipComponent, StoneBadgeComponent } from '@gx/go/ui';
import { OnlineRoomSeatViewModel } from './online-room-page.models';

@Component({
  selector: 'lib-go-online-room-participants-panel',
  standalone: true,
  imports: [ReactiveFormsModule, GameStatusChipComponent, StoneBadgeComponent],
  template: `
    @if (!participantId()) {
      <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/70">
          {{ i18n.t('room.participants.join_room') }}
        </p>
        <h2 class="mt-2 text-xl font-semibold text-stone-50">
          {{ joinCardTitle() }}
        </h2>
        <p class="mt-3 text-sm leading-6 text-stone-300">
          {{ joinCardDescription() }}
        </p>
        <form
          class="mt-4 space-y-4"
          data-testid="join-room-form"
          [formGroup]="joinForm()"
          (ngSubmit)="joinRequested.emit()"
        >
          <label
            [for]="joinDisplayNameInputId"
            class="block space-y-2 text-sm font-medium text-stone-200"
          >
            <span>{{ i18n.t('room.participants.display_name') }}</span>
          </label>
          <input
            [id]="joinDisplayNameInputId"
            formControlName="displayName"
            class="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-300/50"
            maxlength="24"
          />

          <button
            type="submit"
            class="inline-flex items-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
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
    } @else {
      <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          {{ i18n.t('room.participants.you_are_here_as') }}
        </p>
        <div class="mt-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-lg font-semibold text-stone-50">
              {{ viewer()?.displayName }}
            </p>
            <p class="text-xs uppercase tracking-[0.24em] text-stone-400">
              {{ viewerRoleLabel() }}
            </p>
          </div>

          @if (viewerSeat()) {
            <lib-go-stone-badge [color]="viewerSeat()!" />
          }
        </div>
      </section>
    }

    <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
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

      <div class="mt-4 grid gap-3">
        @for (seat of seats(); track seat.color) {
          <div
            class="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4"
            [attr.data-testid]="'seat-' + seat.color"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <lib-go-stone-badge [color]="seat.color" />
                <div>
                  <p class="text-sm font-semibold text-stone-50">
                    {{ i18n.playerLabel(seat.color) }}
                  </p>
                  <p class="text-xs uppercase tracking-[0.24em] text-stone-400">
                    {{
                      seat.occupant?.displayName ??
                        i18n.t('room.participants.open_seat')
                    }}
                  </p>
                </div>
              </div>

              @if (seat.isViewerSeat && canChangeSeats()) {
                <button
                  type="button"
                  class="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  [attr.data-testid]="'release-' + seat.color"
                  [disabled]="!realtimeConnected()"
                  (click)="releaseSeatRequested.emit()"
                >
                  {{ i18n.t('room.participants.release') }}
                </button>
              } @else if (seat.canClaim) {
                <button
                  type="button"
                  class="rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
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

      <div class="mt-5 space-y-3">
        @for (participant of participants(); track participant.participantId) {
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-stone-50">
                  {{ participant.displayName }}
                </p>
                <p class="text-xs uppercase tracking-[0.24em] text-stone-400">
                  {{ participantStatusLabel(participant) }}
                </p>
              </div>

              @if (isHost() && !participant.isHost) {
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-white/15 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    [disabled]="!realtimeConnected()"
                    (click)="
                      participant.muted
                        ? unmuteParticipantRequested.emit(participant.participantId)
                        : muteParticipantRequested.emit(participant.participantId)
                    "
                  >
                    {{
                      participant.muted
                        ? i18n.t('room.participants.unmute')
                        : i18n.t('room.participants.mute')
                    }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-rose-300/30 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-200/50 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"
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
    </section>

    @if (isHost()) {
      <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          {{ i18n.t('room.participants.host_controls') }}
        </p>
        <h2 class="mt-2 text-xl font-semibold text-stone-50">
          {{ i18n.t('room.participants.start_match') }}
        </h2>

        @if (!canChangeSeats()) {
          <p class="mt-3 text-sm leading-6 text-stone-300">
            {{ i18n.t('room.participants.finish_current_before_start') }}
          </p>
        } @else {
          <form
            class="mt-4 space-y-4"
            data-testid="start-match-form"
            [formGroup]="startForm()"
            (ngSubmit)="startMatchRequested.emit()"
          >
            <label
              [for]="startModeSelectId"
              class="block space-y-2 text-sm font-medium text-stone-200"
            >
              <span>{{ i18n.t('room.participants.mode') }}</span>
            </label>
            <select
              [id]="startModeSelectId"
              formControlName="mode"
              class="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-300/50"
            >
              <option value="go">{{ i18n.t('common.mode.go') }}</option>
              <option value="gomoku">{{ i18n.t('common.mode.gomoku') }}</option>
            </select>

            <label
              [for]="startBoardSizeSelectId"
              class="block space-y-2 text-sm font-medium text-stone-200"
            >
              <span>{{ i18n.t('room.participants.board_size') }}</span>
            </label>
            <select
              [id]="startBoardSizeSelectId"
              formControlName="boardSize"
              class="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-300/50"
            >
              @for (size of boardSizeOptions(); track size) {
                <option [value]="size">{{ size }} x {{ size }}</option>
              }
            </select>

            <button
              type="submit"
              class="inline-flex items-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="start-hosted-match"
              [disabled]="!canStartMatch() || !realtimeConnected()"
            >
              {{ i18n.t('room.participants.start_hosted_match') }}
            </button>
          </form>
        }
      </section>
    }

    @if (match()) {
      <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          {{ i18n.t('room.participants.match_actions') }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canPass() || !realtimeConnected()"
            (click)="passRequested.emit()"
          >
            {{ i18n.t('common.move.pass') }}
          </button>
          <button
            type="button"
            class="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canResign() || !realtimeConnected()"
            (click)="resignRequested.emit()"
          >
            {{ i18n.t('common.move.resign') }}
          </button>
          <button
            type="button"
            class="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canFinalizeScoring() || !realtimeConnected()"
            (click)="finalizeScoringRequested.emit()"
          >
            {{ i18n.t('room.participants.finalize_score') }}
          </button>
        </div>

        <div class="mt-5">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              {{ i18n.t('room.participants.move_log') }}
            </p>
            <span class="text-xs text-stone-500">
              {{ i18n.t('ui.match_sidebar.moves_count', { count: moveHistory().length }) }}
            </span>
          </div>

          <div class="max-h-64 overflow-auto pr-1">
            @if (moveHistory().length > 0) {
              <ol class="space-y-2">
                @for (move of moveHistory(); track move.id) {
                  <li
                    class="rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-stone-200"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-semibold">
                        {{ move.moveNumber }}. {{ i18n.moveNotation(move) }}
                      </span>
                      <span class="text-xs uppercase tracking-[0.24em] text-stone-500">
                        {{ i18n.playerLabel(move.player) }}
                      </span>
                    </div>
                  </li>
                }
              </ol>
            } @else {
              <p
                class="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-stone-400"
              >
                {{ i18n.t('room.participants.empty_move_log') }}
              </p>
            }
          </div>
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomParticipantsPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly joinForm = input.required<FormGroup>();
  readonly startForm = input.required<FormGroup>();
  readonly boardSizeOptions = input.required<readonly number[]>();
  readonly participantId = input<string | null>(null);
  readonly joining = input.required<boolean>();
  readonly viewer = input<ParticipantSummary | null>(null);
  readonly viewerSeat = input<PlayerColor | null>(null);
  readonly isHost = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly canChangeSeats = input.required<boolean>();
  readonly canStartMatch = input.required<boolean>();
  readonly canPass = input.required<boolean>();
  readonly canResign = input.required<boolean>();
  readonly canFinalizeScoring = input.required<boolean>();
  readonly joinCardTitle = input.required<string>();
  readonly joinCardDescription = input.required<string>();
  readonly participants = input.required<readonly ParticipantSummary[]>();
  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly moveHistory = input.required<HostedMatchSnapshot['state']['moveHistory']>();

  readonly joinRequested = output<void>();
  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();
  readonly startMatchRequested = output<void>();
  readonly passRequested = output<void>();
  readonly resignRequested = output<void>();
  readonly finalizeScoringRequested = output<void>();
  readonly muteParticipantRequested = output<string>();
  readonly unmuteParticipantRequested = output<string>();
  readonly kickParticipantRequested = output<string>();

  protected readonly joinDisplayNameInputId = 'room-join-display-name';
  protected readonly startModeSelectId = 'room-start-mode';
  protected readonly startBoardSizeSelectId = 'room-start-board-size';

  protected viewerRoleLabel(): string {
    if (this.isHost()) {
      return this.i18n.t('common.role.host');
    }

    const seat = this.viewerSeat();
    return seat
      ? this.i18n.t('room.participants.viewer_role.player', {
          player: this.i18n.playerLabel(seat),
        })
      : this.i18n.t('common.role.spectator');
  }

  protected participantStatusLabel(participant: ParticipantSummary): string {
    const role = participant.isHost
      ? this.i18n.t('common.role.host')
      : participant.seat
        ? this.i18n.t(`common.seat.${participant.seat}`)
        : this.i18n.t('common.role.spectator');
    const status = participant.online
      ? this.i18n.t('common.status.online')
      : this.i18n.t('common.status.offline');

    return participant.muted
      ? `${role} - ${status} - ${this.i18n.t('common.status.muted')}`
      : `${role} - ${status}`;
  }
}
