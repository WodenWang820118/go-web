import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatchPhase, PlayerColor, ResultSummary } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-game-status-chip',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
      [class.border-emerald-400/50]="phase() === 'playing'"
      [class.bg-emerald-500/10]="phase() === 'playing'"
      [class.text-emerald-100]="phase() === 'playing'"
      [class.border-amber-400/50]="phase() === 'scoring'"
      [class.bg-amber-400/10]="phase() === 'scoring'"
      [class.text-amber-50]="phase() === 'scoring'"
      [class.border-sky-400/50]="phase() === 'finished'"
      [class.bg-sky-400/10]="phase() === 'finished'"
      [class.text-sky-50]="phase() === 'finished'"
    >
      <span class="h-2 w-2 rounded-full bg-current opacity-80"></span>
      {{ text() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameStatusChipComponent {
  private readonly i18n = inject(GoI18nService);

  readonly phase = input<MatchPhase>('playing');
  readonly currentPlayer = input<PlayerColor | null>(null);
  readonly result = input<ResultSummary | null>(null);

  readonly text = computed(() => {
    const result = this.result();

    if (this.phase() === 'finished') {
      return result?.winner === 'draw'
        ? this.i18n.t('ui.game_status.draw')
        : this.i18n.t('ui.game_status.win', {
            player: this.i18n.playerLabel(result?.winner === 'white' ? 'white' : 'black'),
          });
    }

    if (this.phase() === 'scoring') {
      return this.i18n.t('ui.game_status.scoring_review');
    }

    return this.i18n.t('ui.game_status.turn', {
      player: this.i18n.playerLabel(this.currentPlayer() ?? 'black'),
    });
  });
}
