import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ParticipantSummary } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { StoneBadgeComponent } from '@gx/go/ui';
import { OnlineRoomJoinFormGroup } from '../../../../contracts/online-room-form.contracts';

@Component({
  selector: 'lib-go-online-room-viewer-panel',
  standalone: true,
  imports: [ReactiveFormsModule, StoneBadgeComponent],
  template: `
    <section
      class="rounded-[1.35rem] border border-white/10 bg-slate-950/84 p-4 text-stone-100 shadow-xl shadow-slate-950/20"
      data-testid="room-viewer-panel"
    >
      @if (!participantId()) {
        <div>
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
              class="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-300/50"
              maxlength="24"
            />

            <button
              type="submit"
              class="inline-flex w-full items-center justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              [disabled]="joining()"
            >
              {{
                joining()
                  ? i18n.t('room.participants.joining_room')
                  : i18n.t('room.participants.join_room')
              }}
            </button>
          </form>
        </div>
      } @else {
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
            {{ i18n.t('room.participants.you_are_here_as') }}
          </p>
          <div class="mt-3 flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-lg font-semibold text-stone-50">
                {{ viewer()?.displayName }}
              </p>
              <div class="mt-2 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-stone-300">
                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  {{ viewerRoleLabel() }}
                </span>
                @if (viewer()?.muted) {
                  <span class="rounded-full border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-rose-100">
                    {{ i18n.t('common.status.muted') }}
                  </span>
                }
              </div>
            </div>

            @if (viewerSeat()) {
              <lib-go-stone-badge [color]="viewerSeat()!" />
            }
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomViewerPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly joinForm = input.required<OnlineRoomJoinFormGroup>();
  readonly participantId = input<string | null>(null);
  readonly joining = input.required<boolean>();
  readonly viewer = input<ParticipantSummary | null>(null);
  readonly viewerSeat = input<PlayerColor | null>(null);
  readonly isHost = input.required<boolean>();
  readonly joinCardTitle = input.required<string>();
  readonly joinCardDescription = input.required<string>();

  readonly joinRequested = output<void>();

  protected readonly joinDisplayNameInputId = 'room-join-display-name';

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
}
