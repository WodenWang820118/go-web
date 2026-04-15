import { createMessage } from '@gx/go/domain';
import { LocalGameSessionAdapter } from '../session/local-game-session.adapter';

describe('LocalGameSessionAdapter', () => {
  it('stores snapshots in memory and returns safe clones', () => {
    const adapter = new LocalGameSessionAdapter();

    adapter.write({
      settings: {
        mode: 'gomoku',
        boardSize: 15,
        komi: 0,
        players: {
          black: 'Lee',
          white: 'Cho',
        },
      },
      state: {
        mode: 'gomoku',
        boardSize: 15,
        board: Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null)),
        phase: 'playing',
        nextPlayer: 'black',
        captures: { black: 0, white: 0 },
        moveHistory: [],
        previousBoardHashes: ['...............'],
        lastMove: null,
        consecutivePasses: 0,
        winnerLine: [],
        message: createMessage('game.state.next_turn', {
          player: createMessage('common.player.black'),
        }),
        scoring: null,
        result: null,
      },
    });

    const firstRead = adapter.read();
    const secondRead = adapter.read();

    expect(firstRead).not.toBeNull();
    expect(secondRead).not.toBeNull();
    expect(firstRead).not.toBe(secondRead);

    if (!firstRead) {
      throw new Error('Expected a stored snapshot.');
    }

    firstRead.settings.players.black = 'Changed';

    expect(adapter.read()?.settings.players.black).toBe('Lee');

    adapter.clear();

    expect(adapter.read()).toBeNull();
  });
});
