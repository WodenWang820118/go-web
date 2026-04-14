import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { MoveRecord } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-online-room-move-log-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      data-testid="room-move-log-panel"
      class="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4 text-stone-100 shadow-xl shadow-slate-950/20"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
            {{ i18n.t('room.participants.move_log') }}
          </p>
          <h2 class="mt-2 text-lg font-semibold text-stone-50">
            {{ i18n.t('room.participants.move_log') }}
          </h2>
        </div>

        <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-stone-300">
          {{ i18n.t('ui.match_sidebar.moves_count', { count: moveHistory().length }) }}
        </span>
      </div>

      <div class="mt-4 max-h-72 overflow-auto pr-1">
        @if (moveHistory().length > 0) {
          <ol class="space-y-2">
            @for (move of moveHistory(); track move.id) {
              <li class="rounded-[1.25rem] border border-white/5 bg-white/5 px-3 py-2 text-sm text-stone-200">
                <div class="flex items-center justify-between gap-3">
                  <span class="truncate font-semibold">
                    {{ move.moveNumber }}. {{ i18n.moveNotation(move) }}
                  </span>
                  <span class="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-400">
                    {{ i18n.playerLabel(move.player) }}
                  </span>
                </div>
              </li>
            }
          </ol>
        } @else {
          <p class="rounded-[1.25rem] border border-dashed border-white/10 px-4 py-5 text-sm text-stone-400">
            {{ i18n.t('room.participants.empty_move_log') }}
          </p>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomMoveLogPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly moveHistory = input.required<readonly MoveRecord[]>();
}
