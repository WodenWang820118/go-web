import {
  boardHash,
  cloneBoard,
  createBoard,
  setCell,
} from './board/board-state';
import { buildScoringState } from './engines/go/go-scoring';
import { GoRulesEngine } from './engines/go-rules-engine';
import { DEFAULT_GO_KOMI, MatchSettings, MatchState } from './types';

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
      scoring: buildScoringState(board, new Set<string>(), settings.komi),
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

  it('clears scoring confirmations when dead stones change', () => {
    const board = createBoard(9);
    setCell(board, { x: 1, y: 1 }, 'white');
    let state: MatchState = {
      ...engine.createInitialState(settings),
      board,
      phase: 'scoring',
      scoring: buildScoringState(board, new Set<string>(), settings.komi),
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
