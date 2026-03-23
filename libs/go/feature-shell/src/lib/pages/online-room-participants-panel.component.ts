import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HostedMatchSnapshot, ParticipantSummary } from '@org/go/contracts';
import { capitalizePlayerColor, PlayerColor } from '@org/go/domain';
import { GameStatusChipComponent, StoneBadgeComponent } from '@org/go/ui';
import { OnlineRoomSeatViewModel } from './online-room-page.models';

@Component({
  selector: 'lib-go-online-room-participants-panel',
  standalone: true,
  imports: [ReactiveFormsModule, GameStatusChipComponent, StoneBadgeComponent],
  template: `
    @if (!participantId()) {
      <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/70">
          Join room
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
            <span>Display name</span>
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
            {{ joining() ? 'Joining room...' : 'Join room' }}
          </button>
        </form>
      </section>
    } @else {
      <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          You are here as
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
            Seats
          </p>
          <h2 class="mt-2 text-xl font-semibold text-stone-50">
            Players and spectators
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
                    {{ capitalizePlayer(seat.color) }}
                  </p>
                  <p class="text-xs uppercase tracking-[0.24em] text-stone-400">
                    {{ seat.occupant?.displayName ?? 'Open seat' }}
                  </p>
                </div>
              </div>

              @if (seat.isViewerSeat && canChangeSeats()) {
                <button
                  type="button"
                  class="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10"
                  [attr.data-testid]="'release-' + seat.color"
                  (click)="releaseSeatRequested.emit()"
                >
                  Release
                </button>
              } @else if (seat.canClaim) {
                <button
                  type="button"
                  class="rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200"
                  [attr.data-testid]="'claim-' + seat.color"
                  (click)="claimSeatRequested.emit(seat.color)"
                >
                  Claim
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
                    class="rounded-full border border-white/15 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/10"
                    (click)="
                      participant.muted
                        ? unmuteParticipantRequested.emit(participant.participantId)
                        : muteParticipantRequested.emit(participant.participantId)
                    "
                  >
                    {{ participant.muted ? 'Unmute' : 'Mute' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-rose-300/30 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-200/50 hover:bg-rose-400/10"
                    (click)="kickParticipantRequested.emit(participant.participantId)"
                  >
                    Kick
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
          Host controls
        </p>
        <h2 class="mt-2 text-xl font-semibold text-stone-50">
          Start a match
        </h2>

        @if (!canChangeSeats()) {
          <p class="mt-3 text-sm leading-6 text-stone-300">
            Finish the current match before reshuffling seats or starting a new game.
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
              <span>Mode</span>
            </label>
            <select
              [id]="startModeSelectId"
              formControlName="mode"
              class="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-300/50"
            >
              <option value="go">Go</option>
              <option value="gomoku">Gomoku</option>
            </select>

            <label
              [for]="startBoardSizeSelectId"
              class="block space-y-2 text-sm font-medium text-stone-200"
            >
              <span>Board size</span>
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
              [disabled]="!canStartMatch()"
            >
              Start hosted match
            </button>
          </form>
        }
      </section>
    }

    @if (match()) {
      <section class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          Match actions
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canPass()"
            (click)="passRequested.emit()"
          >
            Pass
          </button>
          <button
            type="button"
            class="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canResign()"
            (click)="resignRequested.emit()"
          >
            Resign
          </button>
          <button
            type="button"
            class="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canFinalizeScoring()"
            (click)="finalizeScoringRequested.emit()"
          >
            Finalize score
          </button>
        </div>

        <div class="mt-5">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Move log
            </p>
            <span class="text-xs text-stone-500">{{ moveHistory().length }} moves</span>
          </div>

          <div class="max-h-64 overflow-auto pr-1">
            @if (moveHistory().length > 0) {
              <ol class="space-y-2">
                @for (move of moveHistory(); track move.id) {
                  <li
                    class="rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-stone-200"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-semibold">{{ move.moveNumber }}. {{ move.notation }}</span>
                      <span class="text-xs uppercase tracking-[0.24em] text-stone-500">
                        {{ capitalizePlayer(move.player) }}
                      </span>
                    </div>
                  </li>
                }
              </ol>
            } @else {
              <p
                class="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-stone-400"
              >
                Moves will appear here once the game begins.
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
  readonly joinForm = input.required<FormGroup>();
  readonly startForm = input.required<FormGroup>();
  readonly boardSizeOptions = input.required<readonly number[]>();
  readonly participantId = input<string | null>(null);
  readonly joining = input.required<boolean>();
  readonly viewer = input<ParticipantSummary | null>(null);
  readonly viewerSeat = input<PlayerColor | null>(null);
  readonly isHost = input.required<boolean>();
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

  protected capitalizePlayer(color: PlayerColor): string {
    return capitalizePlayerColor(color);
  }

  protected viewerRoleLabel(): string {
    if (this.isHost()) {
      return 'Host';
    }

    const seat = this.viewerSeat();
    return seat ? `${capitalizePlayerColor(seat)} player` : 'Spectator';
  }

  protected participantStatusLabel(participant: ParticipantSummary): string {
    const role = participant.isHost
      ? 'Host'
      : participant.seat
        ? `${capitalizePlayerColor(participant.seat)} seat`
        : 'Spectator';
    const status = participant.online ? 'Online' : 'Offline';

    return participant.muted ? `${role} - ${status} - muted` : `${role} - ${status}`;
  }
}
