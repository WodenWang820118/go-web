import { cloneRoomSnapshot, RoomSnapshot } from './contracts';

describe('contracts', () => {
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
      match: null,
      chat: [],
    };

    const cloned = cloneRoomSnapshot(snapshot);
    cloned.participants[0].displayName = 'Changed';

    expect(snapshot.participants[0].displayName).toBe('Host');
  });
});
