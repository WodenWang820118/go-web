import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import type { RoomRecord } from '../../contracts/rooms.types';
import {
  canEditNextMatchSettings,
  createHostedRematchState,
  findRematchSeat,
  getAutoStartReadiness,
  resetSeatDependentState,
} from './rooms-match-policy';

describe('rooms-match-policy', () => {
  let store: RoomsStore;

  beforeEach(() => {
    store = new RoomsStore(new RoomsErrorsService());
  });

  it('blocks next-match settings edits once both seats are filled', () => {
    const room = createRoomWithTwoParticipants(store);
    assignSeats(store, room);

    expect(canEditNextMatchSettings(room, store)).toBe(false);
  });

  it('allows next-match settings edits before both seats are filled', () => {
    const room = createRoomWithTwoParticipants(store);

    expect(canEditNextMatchSettings(room, store)).toBe(true);
  });

  it('reports a seat-change requirement when auto-start is blocked', () => {
    const room = createRoomWithTwoParticipants(store);
    room.autoStartBlockedUntilSeatChange = true;

    expect(getAutoStartReadiness(room, store)).toEqual({
      ready: false,
      reason: 'auto_start_blocked_until_seat_change',
    });
  });

  it('reports a live match as an auto-start blocker', () => {
    const room = createRoomWithTwoParticipants(store);
    room.match = createHostedMatch('playing');

    expect(getAutoStartReadiness(room, store)).toEqual({
      ready: false,
      reason: 'match_still_live',
    });
  });

  it('reports missing seats as an auto-start blocker', () => {
    const room = createRoomWithTwoParticipants(store);

    expect(getAutoStartReadiness(room, store)).toEqual({
      ready: false,
      reason: 'both_seats_not_filled',
      extra: {
        blackSeat: null,
        whiteSeat: null,
      },
    });
  });

  it('reports pending rematch responses as an auto-start blocker', () => {
    const room = createRoomWithTwoParticipants(store);
    const { host, guest } = assignSeats(store, room);

    room.rematch = createHostedRematchState(host.id, guest.id);

    expect(getAutoStartReadiness(room, store)).toEqual({
      ready: false,
      reason: 'waiting_for_rematch_responses',
      extra: {
        rematchResponses: {
          black: 'pending',
          white: 'pending',
        },
      },
    });
  });

  it('returns seated players when auto-start requirements are satisfied', () => {
    const room = createRoomWithTwoParticipants(store);
    const { host, guest } = assignSeats(store, room);
    room.rematch = {
      participants: {
        black: host.id,
        white: guest.id,
      },
      responses: {
        black: 'accepted',
        white: 'accepted',
      },
    };

    expect(getAutoStartReadiness(room, store)).toEqual({
      ready: true,
      black: host,
      white: guest,
    });
  });

  it('reports rematch participant mismatches as an auto-start blocker', () => {
    const room = createRoomWithTwoParticipants(store);
    const { host, guest } = assignSeats(store, room);
    room.rematch = {
      participants: {
        black: guest.id,
        white: host.id,
      },
      responses: {
        black: 'accepted',
        white: 'accepted',
      },
    };

    expect(getAutoStartReadiness(room, store)).toEqual({
      ready: false,
      reason: 'rematch_participants_mismatch',
      extra: {
        rematchParticipants: {
          black: guest.id,
          white: host.id,
        },
        currentSeats: {
          black: host.id,
          white: guest.id,
        },
      },
    });
  });

  it('finds the rematch seat for each participant', () => {
    const room = createRoomWithTwoParticipants(store);
    const { host, guest } = assignSeats(store, room);
    const rematch = createHostedRematchState(host.id, guest.id);

    expect(findRematchSeat(rematch, host.id)).toBe('black');
    expect(findRematchSeat(rematch, guest.id)).toBe('white');
  });

  it('clears rematch and auto-start blocks after a seat change', () => {
    const room = createRoomWithTwoParticipants(store);
    const { host, guest } = assignSeats(store, room);
    room.rematch = createHostedRematchState(host.id, guest.id);
    room.autoStartBlockedUntilSeatChange = true;

    expect(resetSeatDependentState(room)).toBe(true);
    expect(room.rematch).toBeNull();
    expect(room.autoStartBlockedUntilSeatChange).toBe(false);
  });

  it('reports when there was no seat-dependent state to clear', () => {
    const room = createRoomWithTwoParticipants(store);

    expect(resetSeatDependentState(room)).toBe(false);
    expect(room.rematch).toBeNull();
    expect(room.autoStartBlockedUntilSeatChange).toBe(false);
  });
});

function createRoomWithTwoParticipants(store: RoomsStore): RoomRecord {
  const createdAt = '2026-04-20T00:00:00.000Z';
  const host = store.createParticipant('Host', true, createdAt);
  const guest = store.createParticipant('Guest', false, createdAt);
  const room = store.createRoomRecord(host, createdAt);

  room.participants.set(guest.id, guest);
  room.tokenIndex.set(guest.token, guest.id);

  return room;
}

function assignSeats(store: RoomsStore, room: RoomRecord) {
  const host = store.getParticipantById(room, room.hostParticipantId);
  const guest = [...room.participants.values()].find(
    (participant) => participant.id !== room.hostParticipantId,
  );

  if (!guest) {
    throw new Error('Expected room to have a guest participant.');
  }

  host.seat = 'black';
  guest.seat = 'white';

  return { host, guest };
}

function createHostedMatch(phase: 'playing' | 'finished') {
  return {
    settings: {
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      players: {
        black: 'Host',
        white: 'Guest',
      },
    },
    state: {
      phase,
    } as NonNullable<RoomRecord['match']>['state'],
    startedAt: '2026-04-20T00:00:00.000Z',
  } as NonNullable<RoomRecord['match']>;
}
