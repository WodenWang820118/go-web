import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { buildCoordinateLabels, BoardSize } from '@gx/go/domain';
import { getBoardCoordinateOffsetPercent } from '../board-layout/board-layout';

interface CoordinateLabel {
  readonly label: string | number;
  readonly offset: number;
}

@Component({
  selector: 'lib-go-board-coordinates',
  standalone: true,
  template: `
    <div class="board-coordinate-layer">
      <div
        data-testid="board-coordinates-top"
        class="board-coordinate-rail board-coordinate-rail--optional"
      >
        @for (label of columnLabels(); track label.label) {
          <span
            class="board-coordinate-label board-coordinate-label--column board-coordinate-label--top"
            [style.left.%]="label.offset"
          >
            {{ label.label }}
          </span>
        }
      </div>

      <div data-testid="board-coordinates-bottom" class="board-coordinate-rail">
        @for (label of columnLabels(); track label.label) {
          <span
            class="board-coordinate-label board-coordinate-label--column board-coordinate-label--bottom"
            [style.left.%]="label.offset"
          >
            {{ label.label }}
          </span>
        }
      </div>

      <div data-testid="board-coordinates-left" class="board-coordinate-rail">
        @for (label of rowLabels(); track label.label) {
          <span
            class="board-coordinate-label board-coordinate-label--row board-coordinate-label--left"
            [style.top.%]="label.offset"
          >
            {{ label.label }}
          </span>
        }
      </div>

      <div
        data-testid="board-coordinates-right"
        class="board-coordinate-rail board-coordinate-rail--optional"
      >
        @for (label of rowLabels(); track label.label) {
          <span
            class="board-coordinate-label board-coordinate-label--row board-coordinate-label--right"
            [style.top.%]="label.offset"
          >
            {{ label.label }}
          </span>
        }
      </div>
    </div>
  `,
  styles: `
    .board-coordinate-layer,
    .board-coordinate-rail {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .board-coordinate-rail--optional {
      display: none;
    }

    .board-coordinate-label {
      position: absolute;
      color: rgba(68, 64, 60, 0.75);
      font-size: 0.55rem;
      font-weight: 700;
      line-height: 1;
      user-select: none;
    }

    .board-coordinate-label--column {
      letter-spacing: 0.18em;
      text-transform: uppercase;
      transform: translateX(-50%);
    }

    .board-coordinate-label--row {
      letter-spacing: 0.12em;
      transform: translateY(-50%);
    }

    .board-coordinate-label--top {
      top: 0.5rem;
    }

    .board-coordinate-label--bottom {
      bottom: 0.5rem;
    }

    .board-coordinate-label--left {
      left: 0.5rem;
    }

    .board-coordinate-label--right {
      right: 0.5rem;
    }

    @media (min-width: 640px) {
      .board-coordinate-rail--optional {
        display: block;
      }

      .board-coordinate-label {
        font-size: 0.65rem;
      }

      .board-coordinate-label--column,
      .board-coordinate-label--row {
        letter-spacing: 0.3em;
      }

      .board-coordinate-label--top {
        top: 0.625rem;
      }

      .board-coordinate-label--bottom {
        bottom: 0.625rem;
      }

      .board-coordinate-label--left {
        left: 0.625rem;
      }

      .board-coordinate-label--right {
        right: 0.625rem;
      }
    }
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
  readonly columnLabels = computed<CoordinateLabel[]>(() =>
    this.labels().map((label, index) => ({
      label,
      offset: getBoardCoordinateOffsetPercent(this.boardSize(), index),
    })),
  );
  readonly rowLabels = computed<CoordinateLabel[]>(() =>
    this.rows().map((label, index) => ({
      label,
      offset: getBoardCoordinateOffsetPercent(this.boardSize(), index),
    })),
  );
}
