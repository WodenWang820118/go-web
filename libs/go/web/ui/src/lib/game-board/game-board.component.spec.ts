import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameBoardComponent } from './game-board.component';

describe('GameBoardComponent', () => {
  let component: GameBoardComponent;
  let fixture: ComponentFixture<GameBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameBoardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', 'gomoku');
    fixture.componentRef.setInput('boardSize', 15);
    fixture.componentRef.setInput(
      'board',
      Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null)),
    );
    fixture.componentRef.setInput('phase', 'playing');
    fixture.componentRef.setInput('currentPlayer', 'black');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders a full set of intersections', () => {
    const intersections = fixture.nativeElement.querySelectorAll('[data-testid^="intersection-"]');

    expect(intersections.length).toBe(225);
  });

  it('emits clicks for selected intersections', () => {
    const emitted: Array<{ x: number; y: number }> = [];
    component.pointSelected.subscribe(value => emitted.push(value));

    const board = fixture.nativeElement.querySelector('.board-surface') as SVGElement;
    const boardPixels = 944;

    Object.defineProperty(board, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right: boardPixels,
          bottom: boardPixels,
          width: boardPixels,
          height: boardPixels,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    board.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 489,
        clientY: 461,
      }),
    );
    board.dispatchEvent(
      new MouseEvent('pointerup', {
        bubbles: true,
        clientX: 489,
        clientY: 461,
      }),
    );

    expect(emitted).toEqual([{ x: 7, y: 7 }]);
  });

  it('supports keyboard navigation and enter-to-place', () => {
    const emitted: Array<{ x: number; y: number }> = [];
    component.pointSelected.subscribe(value => emitted.push(value));

    const wrapper = fixture.nativeElement.querySelector('.board-wrapper');
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toEqual([{ x: 8, y: 7 }]);
  });
});
