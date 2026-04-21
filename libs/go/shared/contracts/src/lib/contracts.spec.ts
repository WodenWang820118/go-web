import { RoomSnapshot, cloneRoomSnapshot } from './contracts';
import {
  MAX_DISPLAY_NAME_LENGTH,
  createUniqueDisplayName,
} from './display-name.utils';

describe('go-contracts', () => {
  it('clones room snapshots defensively', () => {
    const snapshot: RoomSnapshot = {
      roomId: 'room-1',
      createdAt: '2026-03-20T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
      hostParticipantId: 'host-1',
      participants: [
        {
          participantId: 'host-1',
          displayName: 'Host',
          seat: 'black',
          isHost: true,
          online: true,
          muted: false,
          joinedAt: '2026-03-20T00:00:00.000Z',
        },
      ],
      seatState: {
        black: 'host-1',
        white: null,
      },
      nextMatchSettings: {
        mode: 'go',
        boardSize: 19,
        komi: 6.5,
      },
      rematch: {
        participants: {
          black: 'host-1',
          white: 'guest-1',
        },
        responses: {
          black: 'accepted',
          white: 'pending',
        },
      },
      autoStartBlockedUntilSeatChange: false,
      match: {
        settings: {
          mode: 'go',
          boardSize: 19,
          players: {
            black: 'Host',
            white: 'Guest',
          },
          komi: 6.5,
        },
        state: {
          mode: 'go',
          phase: 'playing',
          boardSize: 19,
          board: Array.from({ length: 19 }, () => Array(19).fill(null)),
          nextPlayer: 'black',
          captures: {
            black: 0,
            white: 0,
          },
          moveHistory: [],
          message: {
            key: 'game.state.next_turn',
            params: {
              player: {
                key: 'common.player.black',
              },
            },
          },
        },
        startedAt: '2026-03-20T00:05:00.000Z',
      },
      chat: [
        {
          id: 'chat-1',
          participantId: 'host-1',
          displayName: 'Host',
          message: 'Hello',
          sentAt: '2026-03-20T00:10:00.000Z',
          system: false,
        },
      ],
    };

    const cloned = cloneRoomSnapshot(snapshot);
    const clonedMatch = cloned.match;
    const firstBoardRow = clonedMatch?.state.board[0];
    const clonedRematch = cloned.rematch;
    const firstChatEntry = cloned.chat[0];

    if (!clonedMatch || !firstBoardRow || !clonedRematch || !firstChatEntry) {
      throw new Error(
        'Expected snapshot clone to include nested match, rematch, and chat data',
      );
    }

    cloned.participants[0].displayName = 'Changed';
    firstBoardRow[0] = 'black';
    clonedRematch.responses.black = 'declined';
    firstChatEntry.message = 'Updated';

    expect(snapshot.participants[0].displayName).toBe('Host');
    expect(snapshot.match?.state.board[0]?.[0]).toBeNull();
    expect(snapshot.rematch?.responses.black).toBe('accepted');
    expect(snapshot.chat[0]?.message).toBe('Hello');
  });

  it('adds a numeric suffix when a display name is already taken', () => {
    expect(createUniqueDisplayName('Host', ['Host', 'Host (2)', 'Guest'])).toBe(
      'Host (3)',
    );
  });

  it('trims the base name so suffixed duplicates still fit the max length', () => {
    expect(
      createUniqueDisplayName('A'.repeat(MAX_DISPLAY_NAME_LENGTH), [
        'A'.repeat(MAX_DISPLAY_NAME_LENGTH),
      ]),
    ).toBe(`${'A'.repeat(MAX_DISPLAY_NAME_LENGTH - 4)} (2)`);
  });
});
