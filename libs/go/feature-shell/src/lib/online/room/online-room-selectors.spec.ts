import { HostedMatchSnapshot, RoomSnapshot } from '@gx/go/contracts';
import {
  selectCanChangeSeats,
  selectCanInteractBoard,
  selectHostedMatch,
  selectRoomParticipants,
  selectViewer,
  selectViewerSeat,
} from './online-room-selectors';

describe('online-room-selectors', () => {
  it('returns the participants, match, viewer, and viewer seat from a snapshot', () => {
    const snapshot = createSnapshot(createMatch('playing'));

    expect(selectRoomParticipants(snapshot)).toHaveLength(2);
    expect(selectHostedMatch(snapshot)?.state.phase).toBe('playing');
    expect(selectViewer(snapshot.participants, 'host-1')?.displayName).toBe('Host');
    expect(selectViewerSeat(selectViewer(snapshot.participants, 'host-1'))).toBe('black');
  });

  it('only allows board interaction when the phase rules permit it', () => {
    expect(selectCanInteractBoard(createMatch('playing'), 'black')).toBe(true);
    expect(selectCanInteractBoard(createMatch('playing'), 'white')).toBe(false);
    expect(selectCanInteractBoard(createMatch('scoring'), 'white')).toBe(true);
    expect(selectCanInteractBoard(createMatch('finished'), 'black')).toBe(false);
  });

  it('allows seat changes only before a match starts or after it finishes', () => {
    expect(selectCanChangeSeats(null)).toBe(true);
    expect(selectCanChangeSeats(createMatch('playing'))).toBe(false);
    expect(selectCanChangeSeats(createMatch('finished'))).toBe(true);
  });
});

function createSnapshot(match: HostedMatchSnapshot | null): RoomSnapshot {
  return {
    roomId: 'ROOM42',
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
      {
        participantId: 'guest-1',
        displayName: 'Guest',
        seat: 'white',
        isHost: false,
        online: true,
        muted: false,
        joinedAt: '2026-03-20T00:01:00.000Z',
      },
    ],
    seatState: {
      black: 'host-1',
      white: 'guest-1',
    },
    nextMatchSettings: {
      mode: 'go',
      boardSize: 19,
      komi: 6.5,
    },
    rematch: null,
    autoStartBlockedUntilSeatChange: false,
    match,
    chat: [],
  };
}

function createMatch(phase: 'playing' | 'scoring' | 'finished'): HostedMatchSnapshot {
  return {
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
      phase,
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
      },
      ...(phase === 'finished'
        ? {
            result: {
              winner: 'black',
              summary: {
                key: 'game.result.win_by_points',
              },
            },
          }
        : {}),
    },
    startedAt: '2026-03-20T00:05:00.000Z',
  };
}
