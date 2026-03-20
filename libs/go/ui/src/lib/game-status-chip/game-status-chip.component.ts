import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatchPhase, PlayerColor, ResultSummary } from '@org/go/domain';

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
  readonly phase = input<MatchPhase>('playing');
  readonly currentPlayer = input<PlayerColor | null>(null);
  readonly result = input<ResultSummary | null>(null);

  readonly text = computed(() => {
    if (this.phase() === 'finished') {
      return this.result()?.winner === 'draw'
        ? 'Draw'
        : `${this.result()?.winner ?? 'black'} wins`;
    }

    if (this.phase() === 'scoring') {
      return 'Scoring review';
    }

    return `${this.currentPlayer() ?? 'black'} turn`;
  });
}
