import { ComponentFixture, TestBed } from '@angular/core/testing';
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

    expect(top.className).toContain('hidden');
    expect(top.className).toContain('sm:flex');
    expect(right.className).toContain('hidden');
    expect(right.className).toContain('sm:flex');
    expect(bottom.className).not.toContain('hidden');
    expect(left.className).not.toContain('hidden');
    expect(bottom.querySelectorAll('span').length).toBe(9);
    expect(left.querySelectorAll('span')[0]?.textContent?.trim()).toBe('9');
  });
});
