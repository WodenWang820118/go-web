import { HostedRematchState } from '@gx/go/contracts';
import { type PlayerColor } from '@gx/go/domain';
import type {
  ParticipantRecord,
  RoomRecord,
} from '../../contracts/rooms.types';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';

export type AutoStartReadiness =
  | {
      ready: true;
      black: ParticipantRecord;
      white: ParticipantRecord;
    }
  | {
      ready: false;
      reason: string;
      extra?: Record<string, unknown>;
    };

export function canEditNextMatchSettings(
  room: RoomRecord,
  store: RoomsStore,
): boolean {
  if (room.rematch) {
    return false;
  }

  if (room.match && room.match.state.phase !== 'finished') {
    return false;
  }

  return (
    !store.getSeatHolder(room, 'black') || !store.getSeatHolder(room, 'white')
  );
}

export function createHostedRematchState(
  blackParticipantId: string,
  whiteParticipantId: string,
): HostedRematchState {
  return {
    participants: {
      black: blackParticipantId,
      white: whiteParticipantId,
    },
    responses: {
      black: 'pending',
      white: 'pending',
    },
  };
}

export function findRematchSeat(
  rematch: HostedRematchState,
  participantId: string,
): PlayerColor | null {
  if (rematch.participants.black === participantId) {
    return 'black';
  }

  if (rematch.participants.white === participantId) {
    return 'white';
  }

  return null;
}

export function getAutoStartReadiness(
  room: RoomRecord,
  store: RoomsStore,
): AutoStartReadiness {
  if (room.autoStartBlockedUntilSeatChange) {
    return {
      ready: false,
      reason: 'auto_start_blocked_until_seat_change',
    };
  }

  if (room.match && room.match.state.phase !== 'finished') {
    return {
      ready: false,
      reason: 'match_still_live',
    };
  }

  const black = store.getSeatHolder(room, 'black');
  const white = store.getSeatHolder(room, 'white');

  if (!black || !white) {
    return {
      ready: false,
      reason: 'both_seats_not_filled',
      extra: {
        blackSeat: black?.id ?? null,
        whiteSeat: white?.id ?? null,
      },
    };
  }

  if (
    room.rematch &&
    (room.rematch.responses.black !== 'accepted' ||
      room.rematch.responses.white !== 'accepted')
  ) {
    return {
      ready: false,
      reason: 'waiting_for_rematch_responses',
      extra: {
        rematchResponses: room.rematch.responses,
      },
    };
  }

  if (
    room.rematch &&
    (room.rematch.participants.black !== black.id ||
      room.rematch.participants.white !== white.id)
  ) {
    return {
      ready: false,
      reason: 'rematch_participants_mismatch',
      extra: {
        rematchParticipants: room.rematch.participants,
        currentSeats: {
          black: black.id,
          white: white.id,
        },
      },
    };
  }

  return {
    ready: true,
    black,
    white,
  };
}

export function isAutoStartReady(
  readiness: AutoStartReadiness,
): readiness is Extract<AutoStartReadiness, { ready: true }> {
  return readiness.ready;
}

export function resetSeatDependentState(room: RoomRecord): boolean {
  const hadSeatDependentState =
    room.rematch !== null ||
    room.autoStartBlockedUntilSeatChange ||
    room.nigiri !== null ||
    room.nigiriSecret !== null;

  room.rematch = null;
  room.autoStartBlockedUntilSeatChange = false;
  room.nigiri = null;
  room.nigiriSecret = null;

  return hadSeatDependentState;
}
