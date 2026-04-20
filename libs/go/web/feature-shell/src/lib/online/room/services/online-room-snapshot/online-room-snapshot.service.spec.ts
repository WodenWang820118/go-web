import { RoomSnapshot } from '@gx/go/contracts';
import { OnlineRoomSnapshotService } from './online-room-snapshot.service';

describe('OnlineRoomSnapshotService', () => {
  const snapshots = new OnlineRoomSnapshotService();

  it('caps the chat history to the latest 100 messages', () => {
    const snapshot = createSnapshot(
      Array.from({ length: 100 }, (_, index) => ({
        id: `chat-${index}`,
        participantId: 'host-1',
        displayName: 'Host',
        message: `Message ${index}`,
        sentAt: '2026-03-20T00:00:00.000Z',
        system: false,
      }))
    );

    const updated = snapshots.applyChatMessage(snapshot, {
      roomId: 'ROOM42',
      message: {
        id: 'chat-100',
        participantId: 'guest-1',
        displayName: 'Guest',
        message: 'Newest',
        sentAt: '2026-03-20T00:01:00.000Z',
        system: false,
      },
    });

    expect(updated.chat).toHaveLength(100);
    expect(updated.chat[0]?.id).toBe('chat-1');
    expect(updated.chat.at(-1)?.id).toBe('chat-100');
  });

  it('builds a share url only when room id and origin are available', () => {
    expect(snapshots.buildRoomShareUrl('ROOM42', 'https://gx.go')).toBe(
      'https://gx.go/online/room/ROOM42'
    );
    expect(snapshots.buildRoomShareUrl(null, 'https://gx.go')).toBe('');
    expect(snapshots.buildRoomShareUrl('ROOM42', '')).toBe('');
  });
});

function createSnapshot(chat: RoomSnapshot['chat']): RoomSnapshot {
  return {
    roomId: 'ROOM42',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    hostParticipantId: 'host-1',
    participants: [],
    seatState: {
      black: null,
      white: null,
    },
    nextMatchSettings: {
      mode: 'go',
      boardSize: 19,
      komi: 6.5,
    },
    rematch: null,
    autoStartBlockedUntilSeatChange: false,
    match: null,
    chat,
  };
}
