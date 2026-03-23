import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { buildCoordinateLabels, BoardSize } from '@gx/go/domain';

@Component({
  selector: 'lib-go-board-coordinates',
  standalone: true,
  template: `
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute left-10 right-10 top-2 flex justify-between px-6 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-stone-700/80">
        @for (label of labels(); track label) {
          <span>{{ label }}</span>
        }
      </div>

      <div class="absolute bottom-2 left-10 right-10 flex justify-between px-6 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-stone-700/80">
        @for (label of labels(); track label) {
          <span>{{ label }}</span>
        }
      </div>

      <div class="absolute bottom-10 left-2 top-10 flex flex-col justify-between py-6 text-[0.65rem] font-semibold tracking-[0.3em] text-stone-700/80">
        @for (label of rows(); track label) {
          <span>{{ label }}</span>
        }
      </div>

      <div class="absolute bottom-10 right-2 top-10 flex flex-col justify-between py-6 text-[0.65rem] font-semibold tracking-[0.3em] text-stone-700/80">
        @for (label of rows(); track label) {
          <span>{{ label }}</span>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCoordinatesComponent {
  readonly boardSize = input<BoardSize>(19);
  readonly labels = computed(() => buildCoordinateLabels(this.boardSize()));
  readonly rows = computed(() =>
    Array.from({ length: this.boardSize() }, (_, index) => this.boardSize() - index)
  );
}
