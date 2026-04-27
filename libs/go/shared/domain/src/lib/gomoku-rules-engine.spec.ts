import { GomokuRulesEngine } from './engines/gomoku-rules-engine';
import { boardHash, createBoard, setCell } from './board/board-state';
import { MatchSettings } from './types';

describe('GomokuRulesEngine', () => {
  const engine = new GomokuRulesEngine();
  const settings: MatchSettings = {
    mode: 'gomoku',
    boardSize: 15,
    players: {
      black: 'Black',
      white: 'White',
    },
    komi: 0,
  };

  it('alternates turns and rejects occupied intersections', () => {
    let state = engine.createInitialState(settings);

    state = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 7, y: 7 },
    }).state;

    expect(state.nextPlayer).toBe('white');

    const duplicate = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 7, y: 7 },
    });

    expect(duplicate.ok).toBe(false);
    expect(duplicate.error).toMatchObject({
      key: 'game.error.intersection_occupied',
    });
  });

  it('detects a horizontal five-in-a-row win', () => {
    let state = engine.createInitialState(settings);

    for (const move of [
      { x: 3, y: 7 },
      { x: 0, y: 0 },
      { x: 4, y: 7 },
      { x: 0, y: 1 },
      { x: 5, y: 7 },
      { x: 0, y: 2 },
      { x: 6, y: 7 },
      { x: 0, y: 3 },
      { x: 7, y: 7 },
    ]) {
      state = engine.applyMove(state, settings, {
        type: 'place',
        point: move,
      }).state;
    }

    expect(state.phase).toBe('finished');
    expect(state.result?.winner).toBe('black');
    expect(state.winnerLine).toHaveLength(5);
    expect(state.result?.winningLine).toHaveLength(5);
  });

  it('detects a diagonal exact-five win', () => {
    const board = createBoard(settings.boardSize);

    for (const point of [
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 6 },
    ]) {
      setCell(board, point, 'black');
    }

    const state = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'black' as const,
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 7, y: 7 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('finished');
    expect(result.state.result?.winner).toBe('black');
    expect(result.state.winnerLine).toEqual([
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 6 },
      { x: 7, y: 7 },
    ]);
    expect(result.state.result?.winningLine).toEqual(result.state.winnerLine);
  });

  it('detects an anti-diagonal exact-five win', () => {
    const board = createBoard(settings.boardSize);

    for (const point of [
      { x: 3, y: 7 },
      { x: 4, y: 6 },
      { x: 5, y: 5 },
      { x: 6, y: 4 },
    ]) {
      setCell(board, point, 'black');
    }

    const state = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'black' as const,
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 7, y: 3 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('finished');
    expect(result.state.result?.winner).toBe('black');
    expect(result.state.winnerLine).toEqual([
      { x: 3, y: 7 },
      { x: 4, y: 6 },
      { x: 5, y: 5 },
      { x: 6, y: 4 },
      { x: 7, y: 3 },
    ]);
    expect(result.state.result?.winningLine).toEqual(result.state.winnerLine);
  });

  it('detects a vertical exact-five win for white', () => {
    const board = createBoard(settings.boardSize);

    for (const point of [
      { x: 7, y: 3 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
    ]) {
      setCell(board, point, 'white');
    }

    const state = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'white' as const,
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 7, y: 7 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('finished');
    expect(result.state.result?.winner).toBe('white');
    expect(result.state.winnerLine).toEqual([
      { x: 7, y: 3 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
    ]);
    expect(result.state.result?.winningLine).toEqual(result.state.winnerLine);
  });

  it('does not count an overline as a win', () => {
    const board = createBoard(settings.boardSize);

    for (const point of [
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 6 },
      { x: 7, y: 7 },
    ]) {
      setCell(board, point, 'black');
    }

    const state = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'black' as const,
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 8, y: 8 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('playing');
    expect(result.state.nextPlayer).toBe('white');
    expect(result.state.winnerLine).toEqual([]);
    expect(result.state.result).toBeNull();
  });

  it('can win with an exact five even when another direction is overline', () => {
    const board = createBoard(settings.boardSize);

    for (const point of [
      { x: 0, y: 7 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 5, y: 6 },
    ]) {
      setCell(board, point, 'black');
    }

    const state = {
      ...engine.createInitialState(settings),
      board,
      nextPlayer: 'black' as const,
      previousBoardHashes: [boardHash(board)],
    };
    const result = engine.applyMove(state, settings, {
      type: 'place',
      point: { x: 5, y: 7 },
    });

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('finished');
    expect(result.state.result?.winner).toBe('black');
    expect(result.state.result?.reason).toBe('five-in-row');
    expect(result.state.winnerLine).toEqual([
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
    ]);
    expect(result.state.result?.winningLine).toEqual(result.state.winnerLine);
  });

  it('supports resignation and blocks pass commands', () => {
    const initialState = engine.createInitialState(settings);
    const passResult = engine.applyMove(initialState, settings, {
      type: 'pass',
    });
    const resignedState = engine.applyMove(initialState, settings, {
      type: 'resign',
      player: 'white',
    }).state;

    expect(passResult.ok).toBe(false);
    expect(resignedState.result?.winner).toBe('black');
    expect(resignedState.result?.reason).toBe('resign');
  });
});
