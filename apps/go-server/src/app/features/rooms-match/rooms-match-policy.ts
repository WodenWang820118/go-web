import { HostedRematchState } from '@gx/go/contracts';
import { type PlayerColor } from '@gx/go/domain';
import { Inject, Injectable } from '@nestjs/common';
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

@Injectable()
export class RoomsMatchPolicyService {
  constructor(@Inject(RoomsStore) private readonly store: RoomsStore) {}

  canEditNextMatchSettings(room: RoomRecord): boolean {
    if (room.rematch) {
      return false;
    }

    if (room.match && room.match.state.phase !== 'finished') {
      return false;
    }

    return (
      !this.store.getSeatHolder(room, 'black') ||
      !this.store.getSeatHolder(room, 'white')
    );
  }

  createHostedRematchState(
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

  findRematchSeat(
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

  getAutoStartReadiness(room: RoomRecord): AutoStartReadiness {
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

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

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

  isAutoStartReady(
    readiness: AutoStartReadiness,
  ): readiness is Extract<AutoStartReadiness, { ready: true }> {
    return readiness.ready;
  }

  resetSeatDependentState(room: RoomRecord): boolean {
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
}
