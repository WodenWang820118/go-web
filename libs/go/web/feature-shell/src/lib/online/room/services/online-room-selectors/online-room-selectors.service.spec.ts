import { TestBed } from '@angular/core/testing';
import { HostedMatchSnapshot, RoomSnapshot } from '@gx/go/contracts';
import { OnlineRoomSelectorsService } from './online-room-selectors.service';

describe('OnlineRoomSelectorsService', () => {
  let service: OnlineRoomSelectorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OnlineRoomSelectorsService],
    });

    service = TestBed.inject(OnlineRoomSelectorsService);
  });

  it('returns the participants, match, viewer, and viewer seat from a snapshot', () => {
    const snapshot = createSnapshot(createMatch('playing'));

    expect(service.selectRoomParticipants(snapshot)).toHaveLength(2);
    expect(service.selectHostedMatch(snapshot)?.state.phase).toBe('playing');
    expect(
      service.selectViewer(snapshot.participants, 'host-1')?.displayName,
    ).toBe('Host');
    expect(
      service.selectViewerSeat(
        service.selectViewer(snapshot.participants, 'host-1'),
      ),
    ).toBe('black');
  });

  it('only allows board interaction when the phase rules permit it', () => {
    expect(
      service.selectCanInteractBoard(createMatch('playing'), 'black'),
    ).toBe(true);
    expect(
      service.selectCanInteractBoard(createMatch('playing'), 'white'),
    ).toBe(false);
    expect(
      service.selectCanInteractBoard(createMatch('scoring'), 'white'),
    ).toBe(true);
    expect(
      service.selectCanInteractBoard(createMatch('finished'), 'black'),
    ).toBe(false);
  });

  it('allows seat changes only before a match starts or after it finishes', () => {
    expect(service.selectCanChangeSeats(null)).toBe(true);
    expect(service.selectCanChangeSeats(createMatch('playing'))).toBe(false);
    expect(service.selectCanChangeSeats(createMatch('finished'))).toBe(true);
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

function createMatch(
  phase: 'playing' | 'scoring' | 'finished',
): HostedMatchSnapshot {
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
