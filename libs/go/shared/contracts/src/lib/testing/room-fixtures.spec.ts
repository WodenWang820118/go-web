import { describe, expect, it } from 'vitest';

import {
  createLobbyOnlineParticipant,
  createLobbyRoomSummary,
  createParticipantSummary,
  createRoomSnapshot,
  createSeatedParticipants,
} from './room-fixtures';

describe('room-fixtures', () => {
  it('derives the host participant id from overridden participants', () => {
    const [host, guest] = createSeatedParticipants({
      host: {
        participantId: 'alpha',
      },
      guest: {
        participantId: 'beta',
      },
    });

    const snapshot = createRoomSnapshot({
      participants: [host, guest],
      seatState: {
        black: host.participantId,
        white: guest.participantId,
      },
    });

    expect(snapshot.hostParticipantId).toBe('alpha');
    expect(snapshot.seatState).toEqual({
      black: 'alpha',
      white: 'beta',
    });
  });

  it('creates seated participants with override-friendly defaults', () => {
    const [host, guest] = createSeatedParticipants({
      guest: {
        displayName: 'Guest Captain',
      },
    });

    expect(host).toMatchObject({
      displayName: 'Host',
      seat: 'black',
      isHost: true,
    });
    expect(guest).toMatchObject({
      displayName: 'Guest Captain',
      seat: 'white',
      isHost: false,
    });
    expect(host.joinedAt).not.toBe(guest.joinedAt);
  });

  it('builds lobby fixtures with safe defaults and per-test overrides', () => {
    const room = createLobbyRoomSummary({
      roomId: 'READY42',
      status: 'ready',
      participantCount: 2,
    });
    const participant = createLobbyOnlineParticipant({
      roomId: room.roomId,
      activity: 'seated',
      seat: 'black',
    });
    const host = createParticipantSummary({
      participantId: 'host-42',
      displayName: 'Room Host',
    });

    expect(room).toMatchObject({
      roomId: 'READY42',
      status: 'ready',
      participantCount: 2,
    });
    expect(participant).toMatchObject({
      roomId: 'READY42',
      activity: 'seated',
      seat: 'black',
    });
    expect(host).toMatchObject({
      participantId: 'host-42',
      displayName: 'Room Host',
      isHost: true,
    });
  });
});
