import { GomokuRulesEngine } from './gomoku-rules-engine';
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
      state = engine.applyMove(state, settings, { type: 'place', point: move }).state;
    }

    expect(state.phase).toBe('finished');
    expect(state.result?.winner).toBe('black');
    expect(state.winnerLine).toHaveLength(5);
  });

  it('counts an overline as a win', () => {
    let state = engine.createInitialState(settings);

    for (const move of [
      { x: 3, y: 3 },
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 1 },
      { x: 5, y: 5 },
      { x: 0, y: 2 },
      { x: 6, y: 6 },
      { x: 0, y: 3 },
      { x: 7, y: 7 },
      { x: 0, y: 4 },
      { x: 8, y: 8 },
    ]) {
      state = engine.applyMove(state, settings, { type: 'place', point: move }).state;
    }

    expect(state.phase).toBe('finished');
    expect(state.result?.winner).toBe('black');
    expect((state.result?.winningLine?.length ?? 0) >= 5).toBe(true);
  });

  it('supports resignation and blocks pass commands', () => {
    const initialState = engine.createInitialState(settings);
    const passResult = engine.applyMove(initialState, settings, { type: 'pass' });
    const resignedState = engine.applyMove(initialState, settings, {
      type: 'resign',
      player: 'white',
    }).state;

    expect(passResult.ok).toBe(false);
    expect(resignedState.result?.winner).toBe('black');
    expect(resignedState.result?.reason).toBe('resign');
  });
});
