import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type BoardSize } from '@gx/go/domain';
import { BoardCoordinatesComponent } from './board-coordinates.component';

describe('BoardCoordinatesComponent', () => {
  let fixture: ComponentFixture<BoardCoordinatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardCoordinatesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardCoordinatesComponent);
    fixture.componentRef.setInput('boardSize', 9);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('keeps the top and right coordinate rails hidden on small screens', () => {
    const root = fixture.nativeElement as HTMLElement;
    const top = root.querySelector(
      '[data-testid="board-coordinates-top"]',
    ) as HTMLElement;
    const bottom = root.querySelector(
      '[data-testid="board-coordinates-bottom"]',
    ) as HTMLElement;
    const left = root.querySelector(
      '[data-testid="board-coordinates-left"]',
    ) as HTMLElement;
    const right = root.querySelector(
      '[data-testid="board-coordinates-right"]',
    ) as HTMLElement;

    expect(top.className).toContain('board-coordinate-rail--optional');
    expect(right.className).toContain('board-coordinate-rail--optional');
    expect(bottom.className).not.toContain('board-coordinate-rail--optional');
    expect(left.className).not.toContain('board-coordinate-rail--optional');
    expect(bottom.querySelectorAll('span').length).toBe(9);
    expect(left.querySelectorAll('span')[0]?.textContent?.trim()).toBe('9');
  });

  for (const boardSize of [
    9, 13, 15, 19,
  ] as const satisfies readonly BoardSize[]) {
    it(`positions ${boardSize}x${boardSize} labels on the same percentages as the board intersections`, () => {
      fixture.componentRef.setInput('boardSize', boardSize);
      fixture.detectChanges();

      const root = fixture.nativeElement as HTMLElement;
      const bottomLabels = root.querySelectorAll<HTMLElement>(
        '[data-testid="board-coordinates-bottom"] span',
      );
      const leftLabels = root.querySelectorAll<HTMLElement>(
        '[data-testid="board-coordinates-left"] span',
      );
      const boardPixels = 52 * 2 + 60 * (boardSize - 1);
      const expectedOffsets = Array.from(
        { length: boardSize },
        (_, index) => ((52 + index * 60) / boardPixels) * 100,
      );

      expect(bottomLabels.length).toBe(boardSize);
      expect(leftLabels.length).toBe(boardSize);

      expectedOffsets.forEach((offset, index) => {
        expect(parseFloat(bottomLabels[index].style.left)).toBeCloseTo(
          offset,
          5,
        );
        expect(parseFloat(leftLabels[index].style.top)).toBeCloseTo(offset, 5);
      });
    });
  }
});
