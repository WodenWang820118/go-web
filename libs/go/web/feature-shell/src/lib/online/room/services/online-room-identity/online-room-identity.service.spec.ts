import { CreateRoomResponse, RoomSnapshot } from '@gx/go/contracts';
import { OnlineRoomIdentityService } from './online-room-identity.service';

describe('OnlineRoomIdentityService', () => {
  const identity = new OnlineRoomIdentityService();

  it('normalizes room ids to uppercase', () => {
    expect(identity.normalizeRoomId('room42')).toBe('ROOM42');
  });

  it('keeps the current participant name when rejoining with a stored identity', () => {
    const snapshot = createSnapshot();

    expect(
      identity.resolveJoinDisplayName('Host', snapshot, {
        displayName: 'Host',
        participantId: 'host-1',
        participantToken: 'token-1',
      }),
    ).toBe('Host');
  });

  it('uses the canonical display name returned by the server response', () => {
    const response: CreateRoomResponse = {
      roomId: 'ROOM42',
      participantId: 'guest-1',
      participantToken: 'token-2',
      snapshot: {
        ...createSnapshot(),
        participants: [
          ...createSnapshot().participants,
          {
            participantId: 'guest-1',
            displayName: 'Guest (2)',
            seat: null,
            isHost: false,
            online: true,
            muted: false,
            joinedAt: '2026-03-20T00:01:00.000Z',
          },
        ],
      },
    };

    expect(identity.resolveResponseDisplayName('Guest', response)).toBe(
      'Guest (2)',
    );
    expect(identity.createStoredRoomIdentity('Guest (2)', response)).toEqual({
      displayName: 'Guest (2)',
      participantId: 'guest-1',
      participantToken: 'token-2',
    });
  });
});

function createSnapshot(): RoomSnapshot {
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
        participantId: 'guest-2',
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
      white: 'guest-2',
    },
    nextMatchSettings: {
      mode: 'go',
      boardSize: 19,
      komi: 6.5,
    },
    rematch: null,
    autoStartBlockedUntilSeatChange: false,
    match: null,
    chat: [],
  };
}
