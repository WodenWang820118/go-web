import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  BoardPoint,
  BoardSize,
  GameMode,
  getAllPoints,
  getCell,
  isPointInBounds,
  MatchPhase,
  PlayerColor,
  pointEquals,
  pointKey,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { BoardCoordinatesComponent } from '../board-coordinates/board-coordinates.component';

@Component({
  selector: 'lib-go-game-board',
  standalone: true,
  imports: [CommonModule, BoardCoordinatesComponent],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameBoardComponent {
  private readonly i18n = inject(GoI18nService);

  readonly mode = input<GameMode>('go');
  readonly boardSize = input<BoardSize>(9);
  readonly board = input<(PlayerColor | null)[][]>([]);
  readonly phase = input<MatchPhase>('playing');
  readonly currentPlayer = input<PlayerColor>('black');
  readonly lastMove = input<BoardPoint | null>(null);
  readonly winningLine = input<BoardPoint[]>([]);
  readonly deadStones = input<string[]>([]);
  readonly interactive = input(true);

  readonly pointSelected = output<BoardPoint>();

  private readonly cellSize = 60;
  private readonly padding = 52;
  private readonly hoverPoint = signal<BoardPoint | null>(null);
  private readonly keyboardPoint = signal<BoardPoint>({ x: -1, y: -1 });

  readonly points = computed(() => getAllPoints(this.boardSize()));
  readonly boardPixels = computed(
    () => this.padding * 2 + this.cellSize * (this.boardSize() - 1),
  );
  readonly linePositions = computed(() =>
    Array.from(
      { length: this.boardSize() },
      (_, index) => this.padding + index * this.cellSize,
    ),
  );
  readonly ghostPoint = computed(() => {
    if (this.phase() !== 'playing') {
      return null;
    }

    const hoverPoint = this.hoverPoint();

    if (!hoverPoint || getCell(this.board(), hoverPoint) !== null) {
      return null;
    }

    return hoverPoint;
  });
  readonly winningPointKeys = computed(
    () => new Set(this.winningLine().map((point) => pointKey(point))),
  );
  readonly deadStoneKeys = computed(() => new Set(this.deadStones()));
  readonly starPoints = computed(() => this.resolveStarPoints());
  readonly ariaLabel = computed(() =>
    this.i18n.t('ui.game_board.aria_label', {
      mode: this.i18n.t(`common.mode.${this.mode()}`),
      size: this.boardSize(),
    }),
  );
  protected readonly pointEquals = pointEquals;
  protected readonly pointKey = pointKey;

  constructor() {
    effect(() => {
      const size = this.boardSize();
      const centerPoint = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
      const point = this.keyboardPoint();

      this.keyboardPoint.set(
        isPointInBounds(point, size) ? point : centerPoint,
      );
    });
  }

  x(point: BoardPoint): number {
    return this.padding + point.x * this.cellSize;
  }

  y(point: BoardPoint): number {
    return this.padding + point.y * this.cellSize;
  }

  stoneRadius(): number {
    return this.cellSize * 0.34;
  }

  hasStone(point: BoardPoint): boolean {
    return getCell(this.board(), point) !== null;
  }

  stoneColor(point: BoardPoint): PlayerColor | null {
    return getCell(this.board(), point);
  }

  isKeyboardPoint(point: BoardPoint): boolean {
    return pointEquals(this.keyboardPoint(), point);
  }

  isWinningPoint(point: BoardPoint): boolean {
    return this.winningPointKeys().has(pointKey(point));
  }

  isDeadStone(point: BoardPoint): boolean {
    return this.deadStoneKeys().has(pointKey(point));
  }

  onHover(point: BoardPoint): void {
    if (!this.interactive()) {
      return;
    }

    this.hoverPoint.set(point);
  }

  clearHover(): void {
    this.hoverPoint.set(null);
  }

  onBoardPointerMove(event: MouseEvent): void {
    if (!this.interactive()) {
      return;
    }

    this.hoverPoint.set(this.resolvePointFromPointer(event));
  }

  onBoardClick(event: MouseEvent): void {
    const point = this.resolvePointFromPointer(event);

    if (!point) {
      return;
    }

    this.selectPoint(point);
  }

  selectPoint(point: BoardPoint): void {
    if (!this.interactive()) {
      return;
    }

    this.keyboardPoint.set(point);
    this.pointSelected.emit(point);
  }

  onKeyDown(event: KeyboardEvent): void {
    const current = this.keyboardPoint();
    let nextPoint = current;

    switch (event.key) {
      case 'ArrowUp':
        nextPoint = { ...current, y: Math.max(0, current.y - 1) };
        break;
      case 'ArrowDown':
        nextPoint = {
          ...current,
          y: Math.min(this.boardSize() - 1, current.y + 1),
        };
        break;
      case 'ArrowLeft':
        nextPoint = { ...current, x: Math.max(0, current.x - 1) };
        break;
      case 'ArrowRight':
        nextPoint = {
          ...current,
          x: Math.min(this.boardSize() - 1, current.x + 1),
        };
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectPoint(current);
        return;
      default:
        return;
    }

    event.preventDefault();
    this.keyboardPoint.set(nextPoint);
  }

  dataTestId(point: BoardPoint): string {
    return `intersection-${point.x}-${point.y}`;
  }

  private resolvePointFromPointer(event: MouseEvent): BoardPoint | null {
    const svg = event.currentTarget;

    if (!(svg instanceof SVGSVGElement)) {
      return null;
    }

    const rect = svg.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    const boardPixels = this.boardPixels();
    const svgX = ((event.clientX - rect.left) / rect.width) * boardPixels;
    const svgY = ((event.clientY - rect.top) / rect.height) * boardPixels;
    const maxIndex = this.boardSize() - 1;

    return {
      x: this.clampCoordinate(
        Math.round((svgX - this.padding) / this.cellSize),
        maxIndex,
      ),
      y: this.clampCoordinate(
        Math.round((svgY - this.padding) / this.cellSize),
        maxIndex,
      ),
    };
  }

  private clampCoordinate(value: number, max: number): number {
    return Math.min(Math.max(value, 0), max);
  }

  private resolveStarPoints(): BoardPoint[] {
    if (this.mode() !== 'go') {
      return [];
    }

    const size = this.boardSize();
    const anchors =
      size === 19 ? [3, 9, 15] : size === 13 ? [3, 6, 9] : [2, 4, 6];

    const points = anchors.flatMap((x) => anchors.map((y) => ({ x, y })));

    if (size === 9) {
      return points.filter(
        (point) =>
          (point.x === 2 && point.y === 2) ||
          (point.x === 2 && point.y === 6) ||
          (point.x === 4 && point.y === 4) ||
          (point.x === 6 && point.y === 2) ||
          (point.x === 6 && point.y === 6),
      );
    }

    return points;
  }
}
