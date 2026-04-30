import {
  boardHash,
  cloneBoard,
  createBoard,
  setCell,
} from './board/board-state';
import { buildScoringState } from './engines/go/go-scoring';
import { GoRulesEngine } from './engines/go-rules-engine';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_GO_RULE_OPTIONS,
  isGoKoRule,
  isGoScoringRule,
  MatchSettings,
  MatchState,
  resolveGoRuleOptions,
} from './types';

describe('GoRulesEngine', () => {
  const engine = new GoRulesEngine();
  const settings: MatchSettings = {
    mode: 'go',
    boardSize: 9,
    players: {
      black: 'Black',
      white: 'White',
    },
    komi: DEFAULT_GO_KOMI,
  };

  it('creates an empty opening state', () => {
    const state = engine.createInitialState(settings);

    expect(state.phase).toBe('playing');
    expect(state.nextPlayer).toBe('black');
    expect(state.board[0][0]).toBeNull();
    expect(state.previousBoardHashes).toHaveLength(1);
  });

  it('resolves default Go rule options for legacy settings', () => {
    expect(resolveGoRuleOptions(settings)).toEqual(DEFAULT_GO_RULE_OPTIONS);
    expect(resolveGoRuleOptions(null)).toEqual(DEFAULT_GO_RULE_OPTIONS);
  });

  it('resolves supplied and partial Go rule options', () => {
    expect(
      resolveGoRuleOptions({
        goRules: {
          koRule: 'positional-superko',
          scoringRule: 'japanese-territory',
        },
      }),
    ).toEqual({
      koRule: 'positional-superko',
      scoringRule: 'japanese-territory',
    });
    expect(
      resolveGoRuleOptions({
        goRules: {
          koRule: 'positional-superko',
        },
      }),
    ).toEqual({
      koRule: 'positional-superko',
      scoringRule: 'area',
    });
    expect(
      resolveGoRuleOptions({
        goRules: {
          scoringRule: 'japanese-territory',
        },
      }),
    ).toEqual({
      koRule: 'basic-ko',
      scoringRule: 'japanese-territory',
    });
  });

  it('rejects unknown Go rule option values', () => {
    expect(isGoKoRule('invalid')).toBe(false);
    expect(isGoScoringRule('invalid')).toBe(false);
    expect(
      resolveGoRuleOptions({
        goRules: {
          koRule: 'invalid',
          scoringRule: 'invalid',
        } as never,
      }),
    ).toEqual(DEFAULT_GO_RULE_OPTIONS);
  });

  it('captures surrounded stones', () => {
    let state = engine.createInitialState(settings);

    for (const move of [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 5, y: 5 },
      { x: 2, y: 1 },
      { x: 6, y: 6 },
      { x: 1, y: 2 },
    ]) {
      const result = engine.applyMove(state, settings, {
        type: 'place',
        point: move,
      });
      state = result.state;
    }

    expect(state.board[1][1]).toBeNull();
    expect(state.captures.black).toBe(1);
    expect(state.lastMove?.capturedPoints).toEqual([{ x: 1, y: 1 }]);
  });

  it('captures multi-stone groups when the last liberty is filled', () => {
    const board = createBoard(9);

    for (const point of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
      { x: 2, y: 2 },
    ]) {
      setCell(board, point, 'black');
    }

    setCell(board, { x: 1, y: 1 }, 'white');
    setCell(board, { x: 2, y: 1 }, 'white');

    const state: MatchState = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'black',
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 1, y: 2 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.captures.black).toBe(2);
    expect(result.state.board[1][1]).toBeNull();
    expect(result.state.board[1][2]).toBeNull();
    expect(result.state.lastMove?.capturedPoints).toHaveLength(2);
    expect(result.state.lastMove?.capturedPoints).toEqual(
      expect.arrayContaining([
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]),
    );
  });

  it('rejects occupied intersections', () => {
    let state = engine.createInitialState(settings);

    state = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 4, y: 4 },
    }).state;

    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 4, y: 4 },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({
      key: 'game.error.intersection_occupied',
    });
  });

  it('rejects suicide moves that do not capture opposing stones', () => {
    const board = createBoard(9);

    for (const point of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ]) {
      setCell(board, point, 'black');
    }

    const state: MatchState = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'white',
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 1, y: 1 },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({
      key: 'game.go.error.suicide',
    });
  });

  it('allows moves with no immediate liberty when they capture adjacent stones', () => {
    const board = createBoard(9);

    for (const point of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ]) {
      setCell(board, point, 'black');
    }

    for (const point of [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 1 },
      { x: 1, y: 3 },
    ]) {
      setCell(board, point, 'white');
    }

    const state: MatchState = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'white',
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 1, y: 1 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.captures.white).toBe(4);
    expect(result.state.board[0][1]).toBeNull();
    expect(result.state.board[1][0]).toBeNull();
    expect(result.state.board[1][2]).toBeNull();
    expect(result.state.board[2][1]).toBeNull();
    expect(result.state.board[1][1]).toBe('white');
  });

  it('rejects immediate ko recapture', () => {
    const beforeKo = createBoard(9);
    setCell(beforeKo, { x: 1, y: 0 }, 'black');
    setCell(beforeKo, { x: 2, y: 0 }, 'white');
    setCell(beforeKo, { x: 0, y: 1 }, 'black');
    setCell(beforeKo, { x: 1, y: 1 }, 'white');
    setCell(beforeKo, { x: 3, y: 1 }, 'white');
    setCell(beforeKo, { x: 1, y: 2 }, 'black');
    setCell(beforeKo, { x: 2, y: 2 }, 'white');

    const afterKo = cloneBoard(beforeKo);
    setCell(afterKo, { x: 1, y: 1 }, null);
    setCell(afterKo, { x: 2, y: 1 }, 'black');

    const state: MatchState = {
      ...engine.createInitialState(settings),
      board: afterKo,
      nextPlayer: 'white',
      previousBoardHashes: [boardHash(beforeKo), boardHash(afterKo)],
    };

    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 1, y: 1 },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({
      key: 'game.go.error.ko_repeat',
    });
  });

  it('does not enforce positional superko beyond immediate ko', () => {
    const previousBoard = createBoard(9);
    setCell(previousBoard, { x: 0, y: 0 }, 'black');

    const unrelatedBoard = createBoard(9);
    setCell(unrelatedBoard, { x: 8, y: 8 }, 'white');

    const currentBoard = createBoard(9);
    const state: MatchState = {
      ...engine.createInitialState(settings),
      board: currentBoard,
      nextPlayer: 'black',
      previousBoardHashes: [
        boardHash(previousBoard),
        boardHash(unrelatedBoard),
        boardHash(currentBoard),
      ],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 0, y: 0 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.previousBoardHashes.at(-1)).toBe(
      boardHash(previousBoard),
    );
  });

  it('rejects positional superko repetitions from earlier board history', () => {
    const previousBoard = createBoard(9);
    setCell(previousBoard, { x: 0, y: 0 }, 'black');

    const unrelatedBoard = createBoard(9);
    setCell(unrelatedBoard, { x: 8, y: 8 }, 'white');

    const currentBoard = createBoard(9);
    const state: MatchState = {
      ...engine.createInitialState(settings),
      board: currentBoard,
      nextPlayer: 'black',
      previousBoardHashes: [
        boardHash(previousBoard),
        boardHash(unrelatedBoard),
        boardHash(currentBoard),
      ],
    };
    const result = engine.applyMove(
      state,
      {
        ...settings,
        goRules: {
          koRule: 'positional-superko',
          scoringRule: 'area',
        },
      },
      {
        type: 'place',
        point: { x: 0, y: 0 },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({
      key: 'game.go.error.ko_repeat',
    });
  });

  it('keeps the match playing after a single pass', () => {
    const state = engine.applyMove(
      engine.createInitialState(settings),
      settings,
      {
        type: 'pass',
      },
    ).state;

    expect(state.phase).toBe('playing');
    expect(state.consecutivePasses).toBe(1);
    expect(state.result).toBeNull();
    expect(state.lastMove?.phaseAfterMove).toBe('playing');
  });

  it('opens scoring after two consecutive passes and finishes after both players confirm', () => {
    let state = engine.createInitialState(settings);

    state = engine.applyMove(state, settings, { type: 'pass' }).state;
    state = engine.applyMove(state, settings, { type: 'pass' }).state;

    expect(state.phase).toBe('scoring');
    expect(state.scoring?.score.white).toBe(DEFAULT_GO_KOMI);
    expect(state.scoring?.confirmedBy).toEqual([]);
    expect(state.scoring?.revision).toBe(0);
    expect(state.result).toBeNull();
    expect(state.lastMove?.phaseAfterMove).toBe('scoring');

    state = engine.confirmScoring(state, settings, 'black');

    expect(state.phase).toBe('scoring');
    expect(state.scoring?.confirmedBy).toEqual(['black']);
    expect(state.result).toBeNull();

    state = engine.confirmScoring(state, settings, 'white');

    expect(state.phase).toBe('finished');
    expect(state.result).toMatchObject({
      winner: 'white',
      reason: 'score',
    });
  });

  it('keeps area scoring as live stones plus territory and komi', () => {
    const board = createBoard(9);
    setCell(board, { x: 0, y: 0 }, 'black');
    setCell(board, { x: 8, y: 8 }, 'white');

    const scoring = buildScoringState(board, new Set<string>(), {
      captures: { black: 5, white: 4 },
      komi: settings.komi,
      scoringRule: 'area',
    });

    expect(scoring.score).toMatchObject({
      black: 1,
      blackStones: 1,
      white: 1 + settings.komi,
      whiteStones: 1,
      blackPrisoners: 0,
      whitePrisoners: 0,
      scoringRule: 'area',
    });
  });

  it('scores Japanese territory with captures as prisoner points', () => {
    const scoring = buildScoringState(createBoard(9), new Set<string>(), {
      captures: { black: 2, white: 1 },
      komi: 0,
      scoringRule: 'japanese-territory',
    });

    expect(scoring.score).toMatchObject({
      black: 2,
      white: 1,
      blackPrisoners: 2,
      whitePrisoners: 1,
      scoringRule: 'japanese-territory',
    });
  });

  it('scores manually marked dead stones as Japanese prisoner points', () => {
    const board = createBoard(9);
    setCell(board, { x: 0, y: 0 }, 'black');
    setCell(board, { x: 1, y: 0 }, 'black');
    setCell(board, { x: 2, y: 0 }, 'black');
    setCell(board, { x: 0, y: 1 }, 'black');
    setCell(board, { x: 1, y: 1 }, 'white');
    setCell(board, { x: 2, y: 1 }, 'black');
    setCell(board, { x: 0, y: 2 }, 'black');
    setCell(board, { x: 1, y: 2 }, 'black');
    setCell(board, { x: 2, y: 2 }, 'black');
    setCell(board, { x: 8, y: 8 }, 'white');

    const scoring = buildScoringState(board, new Set(['1,1']), {
      captures: { black: 2, white: 0 },
      komi: 0,
      scoringRule: 'japanese-territory',
    });

    expect(scoring.score).toMatchObject({
      black: 4,
      blackPrisoners: 3,
      blackTerritory: 1,
      scoringRule: 'japanese-territory',
      white: 0,
      whitePrisoners: 0,
      whiteStones: 1,
      whiteTerritory: 0,
    });
  });

  it('scores manually marked black stones as Japanese prisoner points for White', () => {
    const board = createBoard(9);
    setCell(board, { x: 0, y: 0 }, 'white');
    setCell(board, { x: 1, y: 0 }, 'white');
    setCell(board, { x: 2, y: 0 }, 'white');
    setCell(board, { x: 0, y: 1 }, 'white');
    setCell(board, { x: 1, y: 1 }, 'black');
    setCell(board, { x: 2, y: 1 }, 'white');
    setCell(board, { x: 0, y: 2 }, 'white');
    setCell(board, { x: 1, y: 2 }, 'white');
    setCell(board, { x: 2, y: 2 }, 'white');
    setCell(board, { x: 8, y: 8 }, 'black');

    const scoring = buildScoringState(board, new Set(['1,1']), {
      captures: { black: 0, white: 2 },
      komi: 0,
      scoringRule: 'japanese-territory',
    });

    expect(scoring.score).toMatchObject({
      black: 0,
      blackPrisoners: 0,
      blackStones: 1,
      blackTerritory: 0,
      scoringRule: 'japanese-territory',
      white: 4,
      whitePrisoners: 3,
      whiteTerritory: 1,
    });
  });

  it('starts Japanese scoring after two passes and keeps confirmation flow unchanged', () => {
    const japaneseSettings: MatchSettings = {
      ...settings,
      goRules: {
        koRule: 'basic-ko',
        scoringRule: 'japanese-territory',
      },
    };
    let state = engine.createInitialState(japaneseSettings);

    state = engine.applyMove(state, japaneseSettings, { type: 'pass' }).state;
    state = engine.applyMove(state, japaneseSettings, { type: 'pass' }).state;

    expect(state.phase).toBe('scoring');
    expect(state.scoring?.score.scoringRule).toBe('japanese-territory');
    expect(state.scoring?.score.black).toBe(0);
    expect(state.scoring?.score.white).toBe(DEFAULT_GO_KOMI);

    state = engine.confirmScoring(state, japaneseSettings, 'black');
    state = engine.confirmScoring(state, japaneseSettings, 'white');

    expect(state.phase).toBe('finished');
    expect(state.result).toMatchObject({
      winner: 'white',
      reason: 'score',
      score: {
        scoringRule: 'japanese-territory',
      },
    });
  });

  it('can finish a Japanese scoring game with Black ahead on prisoners', () => {
    const japaneseSettings: MatchSettings = {
      ...settings,
      goRules: {
        koRule: 'basic-ko',
        scoringRule: 'japanese-territory',
      },
    };
    let state: MatchState = {
      ...engine.createInitialState(japaneseSettings),
      captures: {
        black: 7,
        white: 0,
      },
    };

    state = engine.applyMove(state, japaneseSettings, { type: 'pass' }).state;
    state = engine.applyMove(state, japaneseSettings, { type: 'pass' }).state;
    state = engine.confirmScoring(state, japaneseSettings, 'black');
    state = engine.confirmScoring(state, japaneseSettings, 'white');

    expect(state.phase).toBe('finished');
    expect(state.result).toMatchObject({
      winner: 'black',
      reason: 'score',
      score: {
        black: 7,
        blackPrisoners: 7,
        scoringRule: 'japanese-territory',
        white: DEFAULT_GO_KOMI,
      },
    });
  });

  it('marks dead groups during scoring and updates the preview score', () => {
    const board = createBoard(9);
    setCell(board, { x: 0, y: 0 }, 'black');
    setCell(board, { x: 1, y: 0 }, 'black');
    setCell(board, { x: 2, y: 0 }, 'black');
    setCell(board, { x: 0, y: 1 }, 'black');
    setCell(board, { x: 1, y: 1 }, 'white');
    setCell(board, { x: 2, y: 1 }, 'black');
    setCell(board, { x: 0, y: 2 }, 'black');
    setCell(board, { x: 2, y: 2 }, 'black');

    const scoringState: MatchState = {
      ...engine.createInitialState(settings),
      board,
      phase: 'scoring',
      scoring: buildScoringState(board, new Set<string>(), {
        captures: { black: 0, white: 0 },
        komi: settings.komi,
        scoringRule: 'area',
      }),
    };

    const toggled = engine.toggleDeadGroup(scoringState, settings, {
      x: 1,
      y: 1,
    });

    expect(toggled.scoring?.deadStones).toContain('1,1');
    expect(toggled.scoring?.confirmedBy).toEqual([]);
    expect(toggled.scoring?.revision).toBe(1);
    expect(
      (toggled.scoring?.score.black ?? 0) >
        (scoringState.scoring?.score.black ?? 0),
    ).toBe(true);

    const restored = engine.toggleDeadGroup(toggled, settings, {
      x: 1,
      y: 1,
    });

    expect(restored.scoring?.deadStones).not.toContain('1,1');
    expect(restored.scoring?.revision).toBe(2);
    expect(restored.scoring?.score.black).toBe(
      scoringState.scoring?.score.black,
    );
  });

  it('marks dead groups through Japanese scoring and updates prisoners', () => {
    const japaneseSettings: MatchSettings = {
      ...settings,
      goRules: {
        koRule: 'basic-ko',
        scoringRule: 'japanese-territory',
      },
    };
    const board = createBoard(9);
    setCell(board, { x: 0, y: 0 }, 'black');
    setCell(board, { x: 1, y: 0 }, 'black');
    setCell(board, { x: 2, y: 0 }, 'black');
    setCell(board, { x: 0, y: 1 }, 'black');
    setCell(board, { x: 1, y: 1 }, 'white');
    setCell(board, { x: 2, y: 1 }, 'black');
    setCell(board, { x: 0, y: 2 }, 'black');
    setCell(board, { x: 1, y: 2 }, 'black');
    setCell(board, { x: 2, y: 2 }, 'black');
    setCell(board, { x: 8, y: 8 }, 'white');

    const scoringState: MatchState = {
      ...engine.createInitialState(japaneseSettings),
      board,
      captures: { black: 2, white: 0 },
      phase: 'scoring',
      scoring: buildScoringState(board, new Set<string>(), {
        captures: { black: 2, white: 0 },
        komi: japaneseSettings.komi,
        scoringRule: 'japanese-territory',
      }),
    };

    const toggled = engine.toggleDeadGroup(scoringState, japaneseSettings, {
      x: 1,
      y: 1,
    });

    expect(toggled.scoring?.deadStones).toContain('1,1');
    expect(toggled.scoring?.score).toMatchObject({
      black: 4,
      blackPrisoners: 3,
      blackTerritory: 1,
      scoringRule: 'japanese-territory',
      white: DEFAULT_GO_KOMI,
      whitePrisoners: 0,
      whiteTerritory: 0,
    });
    expect(toggled.scoring?.confirmedBy).toEqual([]);
    expect(toggled.scoring?.revision).toBe(1);

    const restored = engine.toggleDeadGroup(toggled, japaneseSettings, {
      x: 1,
      y: 1,
    });

    expect(restored.scoring?.deadStones).not.toContain('1,1');
    expect(restored.scoring?.score).toMatchObject({
      black: 2,
      blackPrisoners: 2,
      blackTerritory: 0,
      scoringRule: 'japanese-territory',
    });
    expect(restored.scoring?.revision).toBe(2);
  });

  it('clears scoring confirmations when dead stones change', () => {
    const board = createBoard(9);
    setCell(board, { x: 1, y: 1 }, 'white');
    let state: MatchState = {
      ...engine.createInitialState(settings),
      board,
      phase: 'scoring',
      scoring: buildScoringState(board, new Set<string>(), {
        captures: { black: 0, white: 0 },
        komi: settings.komi,
        scoringRule: 'area',
      }),
    };

    state = engine.confirmScoring(state, settings, 'black');

    expect(state.scoring?.confirmedBy).toEqual(['black']);

    state = engine.toggleDeadGroup(state, settings, { x: 1, y: 1 });

    expect(state.scoring?.deadStones).toEqual(['1,1']);
    expect(state.scoring?.confirmedBy).toEqual([]);
    expect(state.scoring?.revision).toBe(1);
  });

  it('resumes play from scoring when either player disputes the preview', () => {
    let state = engine.createInitialState(settings);

    state = engine.applyMove(state, settings, { type: 'pass' }).state;
    state = engine.applyMove(state, settings, { type: 'pass' }).state;
    state = engine.confirmScoring(state, settings, 'black');
    state = engine.disputeScoring(state, settings, 'white');

    expect(state.phase).toBe('playing');
    expect(state.nextPlayer).toBe('white');
    expect(state.consecutivePasses).toBe(0);
    expect(state.scoring).toBeNull();
    expect(state.result).toBeNull();
    expect(state.message).toMatchObject({
      key: 'game.go.state.scoring_disputed',
    });
  });

  it('ignores scoring confirmation outside the scoring phase', () => {
    const state = engine.createInitialState(settings);

    expect(engine.confirmScoring(state, settings, 'black')).toBe(state);
  });

  it('finishes immediately on resignation', () => {
    const state = engine.applyMove(
      engine.createInitialState(settings),
      settings,
      {
        type: 'resign',
        player: 'black',
      },
    ).state;

    expect(state.phase).toBe('finished');
    expect(state.result?.winner).toBe('white');
    expect(state.result?.reason).toBe('resign');
  });
});
