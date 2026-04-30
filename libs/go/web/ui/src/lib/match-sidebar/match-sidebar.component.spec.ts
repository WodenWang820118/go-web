import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  createMessage,
  type BoardSize,
  type GameMode,
  type MatchSettings,
  type MatchState,
} from '@gx/go/domain';
import { MatchSidebarComponent } from './match-sidebar.component';

describe('MatchSidebarComponent', () => {
  let fixture: ComponentFixture<MatchSidebarComponent>;

  beforeEach(async () => {
    localStorage.setItem('gx.go.locale', 'en');

    await TestBed.configureTestingModule({
      imports: [MatchSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchSidebarComponent);
  });

  afterEach(() => {
    localStorage.removeItem('gx.go.locale');
  });

  it('keeps Go play actions while reserving the lower area for ads', () => {
    renderSidebar('go');

    const root = fixture.nativeElement as HTMLElement;

    expect(buttonLabels()).toEqual(['Pass', 'Resign', 'Rules', 'Restart']);
    expect(root.textContent).not.toContain('Move log');
    expect(root.textContent).not.toContain('Moves will appear here');
    expect(
      root.querySelector('[data-testid="match-sidebar-move-log"]'),
    ).toBeNull();
    expectBlankAdSpace(root);
  });

  it('keeps Go scoring agreement actions available in scoring states', () => {
    renderSidebar('go', { phase: 'scoring', scoring: createScoringState() });

    const root = fixture.nativeElement as HTMLElement;

    expect(buttonLabels()).toEqual([
      'Pass',
      'Resign',
      'Black confirms',
      'White confirms',
      'Black disputes',
      'White disputes',
      'Rules',
      'Restart',
    ]);
    expect(
      root.querySelector('[data-testid="match-sidebar-move-log"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="match-sidebar-ad-space"]'),
    ).not.toBeNull();
    expectBlankAdSpace(root);
    expect(buttonNamed('Pass').disabled).toBe(true);
    expect(buttonNamed('Resign').disabled).toBe(true);
    expect(buttonNamed('Black confirms').disabled).toBe(false);
    expect(buttonNamed('Black disputes').disabled).toBe(false);
  });

  it('keeps finished Go controls compact and inert', () => {
    renderSidebar('go', { phase: 'finished' });

    const root = fixture.nativeElement as HTMLElement;

    expect(buttonLabels()).toEqual(['Pass', 'Resign', 'Rules', 'Restart']);
    expect(buttonNamed('Pass').disabled).toBe(true);
    expect(buttonNamed('Resign').disabled).toBe(true);
    expect(
      root.querySelector('[data-testid="match-sidebar-move-log"]'),
    ).toBeNull();
    expect(buttonNamed('Resign').disabled).toBe(true);
    expectBlankAdSpace(root);
  });

  it('keeps normal Gomoku play actions while reserving the lower area for ads', () => {
    renderSidebar('gomoku');

    const root = fixture.nativeElement as HTMLElement;

    expect(buttonLabels()).toEqual(['Resign', 'Rules', 'Restart']);
    expect(root.textContent).not.toContain('Move log');
    expect(root.textContent).not.toContain('Moves will appear here');
    expect(
      root.querySelector('[data-testid="match-sidebar-move-log"]'),
    ).toBeNull();

    expectBlankAdSpace(root);
  });

  it('does not leak Go scoring actions into Gomoku sidebar states', () => {
    renderSidebar('gomoku', { phase: 'scoring' });

    const root = fixture.nativeElement as HTMLElement;

    expect(buttonLabels()).toEqual(['Resign', 'Rules', 'Restart']);
    expect(
      root.querySelector('[data-testid="match-sidebar-move-log"]'),
    ).toBeNull();

    expectBlankAdSpace(root);
  });

  it('keeps finished Gomoku controls compact and inert', () => {
    renderSidebar('gomoku', { phase: 'finished' });

    const root = fixture.nativeElement as HTMLElement;

    expect(buttonLabels()).toEqual(['Resign', 'Rules', 'Restart']);
    expect(buttonNamed('Resign').disabled).toBe(true);
    expect(
      root.querySelector('[data-testid="match-sidebar-move-log"]'),
    ).toBeNull();
    expectBlankAdSpace(root);
  });

  function renderSidebar(
    mode: GameMode,
    stateOverrides: Partial<MatchState> = {},
  ): void {
    fixture.componentRef.setInput('settings', createSettings(mode));
    fixture.componentRef.setInput('state', createState(mode, stateOverrides));
    fixture.detectChanges();
  }

  function buttonLabels(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      (button) => button.textContent?.trim() ?? '',
    );
  }

  function buttonNamed(label: string): HTMLButtonElement {
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((candidate) => candidate.textContent?.trim() === label);

    expect(button).toBeDefined();

    return button as HTMLButtonElement;
  }

  function expectBlankAdSpace(root: HTMLElement): void {
    const adSpace = root.querySelector(
      '[data-testid="match-sidebar-ad-space"]',
    ) as HTMLElement | null;

    expect(adSpace).not.toBeNull();
    expect(adSpace?.getAttribute('aria-hidden')).toBe('true');
    expect(adSpace?.textContent?.trim()).toBe('');
  }
});

function createSettings(mode: GameMode): MatchSettings {
  const boardSize: BoardSize = mode === 'go' ? 19 : 15;

  return {
    mode,
    boardSize,
    players: {
      black: 'Black',
      white: 'White',
    },
    komi: mode === 'go' ? 6.5 : 0,
  };
}

function createState(
  mode: GameMode,
  overrides: Partial<MatchState> = {},
): MatchState {
  const boardSize: BoardSize = mode === 'go' ? 19 : 15;

  return {
    mode,
    boardSize,
    board: Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => null),
    ),
    phase: 'playing',
    nextPlayer: 'black',
    captures: {
      black: 0,
      white: 0,
    },
    moveHistory: [],
    previousBoardHashes: [],
    lastMove: null,
    consecutivePasses: 0,
    winnerLine: [],
    message: createMessage('game.state.ready'),
    scoring: null,
    result: null,
    ...overrides,
  };
}

function createScoringState(): NonNullable<MatchState['scoring']> {
  return {
    deadStones: [],
    territory: [],
    score: {
      black: 0,
      white: 0,
      blackStones: 0,
      whiteStones: 0,
      blackTerritory: 0,
      whiteTerritory: 0,
      blackPrisoners: 0,
      whitePrisoners: 0,
      komi: 0,
      scoringRule: 'area',
    },
  };
}
