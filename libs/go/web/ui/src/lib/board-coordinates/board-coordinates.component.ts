import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { buildCoordinateLabels, BoardSize } from '@gx/go/domain';

@Component({
  selector: 'lib-go-board-coordinates',
  standalone: true,
  template: `
    <div class="pointer-events-none absolute inset-0">
      <div
        data-testid="board-coordinates-top"
        class="absolute left-8 right-8 top-2 hidden justify-between px-4 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-stone-700/75 sm:flex sm:left-10 sm:right-10 sm:px-6 sm:text-[0.65rem] sm:tracking-[0.3em]"
      >
        @for (label of labels(); track label) {
          <span>{{ label }}</span>
        }
      </div>

      <div
        data-testid="board-coordinates-bottom"
        class="absolute bottom-2 left-8 right-8 flex justify-between px-4 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-stone-700/75 sm:left-10 sm:right-10 sm:px-6 sm:text-[0.65rem] sm:tracking-[0.3em]"
      >
        @for (label of labels(); track label) {
          <span>{{ label }}</span>
        }
      </div>

      <div
        data-testid="board-coordinates-left"
        class="absolute bottom-8 left-2 top-8 flex flex-col justify-between py-4 text-[0.55rem] font-semibold tracking-[0.12em] text-stone-700/75 sm:bottom-10 sm:top-10 sm:py-6 sm:text-[0.65rem] sm:tracking-[0.3em]"
      >
        @for (label of rows(); track label) {
          <span>{{ label }}</span>
        }
      </div>

      <div
        data-testid="board-coordinates-right"
        class="absolute bottom-8 right-2 top-8 hidden flex-col justify-between py-4 text-[0.55rem] font-semibold tracking-[0.12em] text-stone-700/75 sm:flex sm:bottom-10 sm:top-10 sm:py-6 sm:text-[0.65rem] sm:tracking-[0.3em]"
      >
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
    Array.from(
      { length: this.boardSize() },
      (_, index) => this.boardSize() - index,
    ),
  );
}
