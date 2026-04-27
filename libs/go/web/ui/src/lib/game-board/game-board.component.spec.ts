import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameBoardComponent } from './game-board.component';

describe('GameBoardComponent', () => {
  let component: GameBoardComponent;
  let fixture: ComponentFixture<GameBoardComponent>;

  beforeEach(async () => {
    localStorage.setItem('gx.go.locale', 'en');

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

  afterEach(() => {
    localStorage.removeItem('gx.go.locale');
  });

  it('renders a full set of intersections', () => {
    const intersections = fixture.nativeElement.querySelectorAll(
      '[data-testid^="intersection-"]',
    );

    expect(intersections.length).toBe(225);
  });

  it('exposes the board as a labelled grid with active descendant navigation', () => {
    const wrapper = fixture.nativeElement.querySelector(
      '[data-testid="game-board"]',
    ) as HTMLElement;

    expect(wrapper.getAttribute('role')).toBe('grid');
    expect(wrapper.getAttribute('tabindex')).toBe('0');
    expect(wrapper.getAttribute('aria-rowcount')).toBe('15');
    expect(wrapper.getAttribute('aria-colcount')).toBe('15');
    expect(fixture.nativeElement.querySelectorAll('[role="row"]').length).toBe(
      15,
    );
    expect(
      fixture.nativeElement
        .querySelector('[role="row"]')
        ?.getAttribute('aria-rowindex'),
    ).toBe('1');
    expect(wrapper.getAttribute('aria-readonly')).toBe('false');
    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-7-7',
    );
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-7-7')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-7-7')
        ?.getAttribute('tabindex'),
    ).toBe('-1');
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-0-0')
        ?.getAttribute('role'),
    ).toBe('gridcell');
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-0-0')
        ?.getAttribute('aria-rowindex'),
    ).toBe('1');
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-0-0')
        ?.getAttribute('aria-colindex'),
    ).toBe('1');
    expect(
      fixture.nativeElement
        .querySelector('lib-go-board-coordinates')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-8-7',
    );
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-7-7')
        ?.getAttribute('aria-selected'),
    ).toBe('false');
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-8-7')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-8-7')
        ?.getAttribute('aria-disabled'),
    ).toBe('false');
  });

  it('keeps keyboard navigation inside board boundaries', () => {
    const wrapper = fixture.nativeElement.querySelector(
      '[data-testid="game-board"]',
    ) as HTMLElement;

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-7-7',
    );

    for (let index = 0; index < 20; index += 1) {
      wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    }
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-0-0',
    );

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-0-0',
    );

    for (let index = 0; index < 20; index += 1) {
      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      );
    }
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-14-0',
    );

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-14-0',
    );

    for (let index = 0; index < 20; index += 1) {
      wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    }
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-14-14',
    );

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-14-14',
    );

    for (let index = 0; index < 20; index += 1) {
      wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    }
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-0-14',
    );

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-0-14',
    );
  });

  it('marks the grid and points readonly when interaction is disabled', () => {
    fixture.componentRef.setInput('interactive', false);
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector(
      '[data-testid="game-board"]',
    ) as HTMLElement;
    const activePoint = fixture.nativeElement.querySelector(
      '#game-board-point-7-7',
    ) as Element;

    expect(wrapper.getAttribute('aria-readonly')).toBe('true');
    expect(activePoint.getAttribute('aria-disabled')).toBe('true');
  });

  it('does not activate points exposed as disabled', () => {
    const emitted: Array<{ x: number; y: number }> = [];
    component.pointSelected.subscribe((value) => emitted.push(value));
    const board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null as 'black' | 'white' | null),
    );
    board[7][7] = 'black';

    fixture.componentRef.setInput('board', board);
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector(
      '[data-testid="game-board"]',
    ) as HTMLElement;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toEqual([]);

    fixture.componentRef.setInput(
      'board',
      Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null)),
    );
    fixture.componentRef.setInput('phase', 'scoring');
    fixture.detectChanges();

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toEqual([]);
  });

  it('labels intersections with coordinate and stone state for assistive tech', () => {
    const board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null as 'black' | 'white' | null),
    );
    board[7][7] = 'black';

    fixture.componentRef.setInput('board', board);
    fixture.componentRef.setInput('lastMove', { x: 7, y: 7 });
    fixture.componentRef.setInput('winningLine', [
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 9, y: 7 },
      { x: 10, y: 7 },
      { x: 11, y: 7 },
    ]);
    fixture.detectChanges();

    const occupiedPoint = fixture.nativeElement.querySelector(
      '#game-board-point-7-7',
    ) as Element;
    const emptyPoint = fixture.nativeElement.querySelector(
      '#game-board-point-8-8',
    ) as Element;

    expect(occupiedPoint.getAttribute('role')).toBe('gridcell');
    const occupiedLabel = occupiedPoint.getAttribute('aria-label');
    expect(occupiedLabel).toContain('H8');
    expect(occupiedLabel).toContain('Black stone');
    expect(occupiedLabel).toContain('last move');
    expect(occupiedLabel).toContain('winning line');
    expect(occupiedPoint.getAttribute('aria-disabled')).toBe('true');
    const emptyLabel = emptyPoint.getAttribute('aria-label');
    expect(emptyLabel).toContain('J7');
    expect(emptyLabel).toContain('empty intersection');
  });

  it('labels dead stones during scoring review', () => {
    const board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null as 'black' | 'white' | null),
    );
    board[7][7] = 'white';

    fixture.componentRef.setInput('board', board);
    fixture.componentRef.setInput('phase', 'scoring');
    fixture.componentRef.setInput('deadStones', ['7,7']);
    fixture.detectChanges();

    const deadPoint = fixture.nativeElement.querySelector(
      '#game-board-point-7-7',
    ) as Element;
    const deadLabel = deadPoint.getAttribute('aria-label');

    expect(deadLabel).toContain('H8');
    expect(deadLabel).toContain('White stone');
    expect(deadLabel).toContain('marked dead');
    expect(deadPoint.getAttribute('aria-disabled')).toBe('false');
  });

  it('supports keyboard dead-stone toggles during scoring review', () => {
    const emitted: Array<{ x: number; y: number }> = [];
    component.pointSelected.subscribe((value) => emitted.push(value));
    const board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null as 'black' | 'white' | null),
    );
    board[7][7] = 'white';

    fixture.componentRef.setInput('board', board);
    fixture.componentRef.setInput('phase', 'scoring');
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector(
      '[data-testid="game-board"]',
    ) as HTMLElement;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toEqual([{ x: 7, y: 7 }]);

    fixture.componentRef.setInput('deadStones', ['7,7']);
    fixture.detectChanges();

    const toggledPoint = fixture.nativeElement.querySelector(
      '#game-board-point-7-7',
    ) as Element;
    expect(toggledPoint.getAttribute('aria-label')).toContain('marked dead');
    expect(toggledPoint.getAttribute('aria-disabled')).toBe('false');

    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toEqual([
      { x: 7, y: 7 },
      { x: 7, y: 7 },
    ]);

    fixture.componentRef.setInput('deadStones', []);
    fixture.detectChanges();

    expect(toggledPoint.getAttribute('aria-label')).not.toContain(
      'marked dead',
    );
  });

  it('emits clicks for selected intersections', () => {
    const emitted: Array<{ x: number; y: number }> = [];
    component.pointSelected.subscribe((value) => emitted.push(value));

    const board = fixture.nativeElement.querySelector(
      '.board-surface',
    ) as SVGElement;
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
      new MouseEvent('pointerup', {
        bubbles: true,
        clientX: 532,
        clientY: 472,
      }),
    );

    expect(emitted).toEqual([{ x: 8, y: 7 }]);
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector(
      '[data-testid="game-board"]',
    ) as HTMLElement;

    expect(wrapper.getAttribute('aria-activedescendant')).toBe(
      'game-board-point-8-7',
    );
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-7-7')
        ?.getAttribute('aria-selected'),
    ).toBe('false');
    expect(
      fixture.nativeElement
        .querySelector('#game-board-point-8-7')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('supports keyboard navigation and enter-to-place', () => {
    const emitted: Array<{ x: number; y: number }> = [];
    component.pointSelected.subscribe((value) => emitted.push(value));

    const wrapper = fixture.nativeElement.querySelector('.board-wrapper');
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toEqual([{ x: 8, y: 7 }]);

    const board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null as 'black' | 'white' | null),
    );
    board[7][8] = 'black';

    fixture.componentRef.setInput('board', board);
    fixture.detectChanges();

    const selectedPoint = fixture.nativeElement.querySelector(
      '#game-board-point-8-7',
    ) as Element;
    const selectedLabel = selectedPoint.getAttribute('aria-label');

    expect(selectedLabel).toContain('J8');
    expect(selectedLabel).toContain('Black stone');
    expect(selectedPoint.getAttribute('aria-disabled')).toBe('true');
  });
});
