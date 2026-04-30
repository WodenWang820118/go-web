import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type GameStartSettings,
  type HostedNigiriPendingSnapshot,
  type NigiriGuess,
} from '@gx/go/contracts';
import {
  GO_DIGITAL_NIGIRI_OPENING,
  otherPlayer,
  type GoMessageDescriptor,
  type PlayerColor,
} from '@gx/go/domain';
import type {
  ParticipantRecord,
  RoomRecord,
} from '../../contracts/rooms.types';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';

@Injectable()
export class RoomsMatchNigiriService {
  private readonly logger = new Logger(RoomsMatchNigiriService.name);

  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
  ) {}

  /**
   * Single entry point for assigning temporary Go seats before digital nigiri.
   */
  prepareRoomForDirectNigiri(room: RoomRecord): GoMessageDescriptor | null {
    if (
      !this.requiresDigitalNigiri(room.nextMatchSettings) ||
      room.nigiri ||
      room.rematch ||
      room.autoStartBlockedUntilSeatChange ||
      (room.match && room.match.state.phase !== 'finished')
    ) {
      return null;
    }

    if (!this.ensureDirectGoSeats(room)) {
      return null;
    }

    return this.maybeBeginDigitalNigiri(room);
  }

  maybeBeginDigitalNigiri(room: RoomRecord): GoMessageDescriptor | null {
    if (!this.requiresDigitalNigiri(room.nextMatchSettings)) {
      return null;
    }

    if (room.nigiri) {
      return null;
    }

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw this.roomsErrors.badRequest('room.error.both_seats_required');
    }

    const nigiri = this.createPendingNigiri('white');
    room.nigiri = nigiri.publicState;
    room.nigiriSecret = nigiri.secret;

    this.logger.log(
      `[nigiri.start] pending digital nigiri in room ${room.id} (guesser: ${room.nigiri.guesser})`,
    );

    return this.roomsErrors.roomMessage('room.notice.nigiri_started', {
      player: this.roomsErrors.roomMessage(
        `common.player.${room.nigiri.guesser}`,
      ),
    });
  }

  resolvePendingNigiri(
    room: RoomRecord,
    participant: ParticipantRecord,
    guess: unknown,
  ): void {
    const nigiri = room.nigiri;

    if (
      !this.requiresDigitalNigiri(room.nextMatchSettings) ||
      !nigiri ||
      nigiri.status !== 'pending'
    ) {
      throw this.roomsErrors.badRequest('room.error.nigiri_unavailable');
    }

    if (participant.seat !== nigiri.guesser) {
      throw this.roomsErrors.forbidden('room.error.nigiri_guesser_only');
    }

    if (!room.nigiriSecret) {
      throw this.roomsErrors.badRequest('room.error.nigiri_unavailable');
    }

    if (!this.isNigiriGuess(guess)) {
      throw this.roomsErrors.badRequest('room.error.invalid_nigiri_guess');
    }

    const assignedBlack: PlayerColor =
      guess === room.nigiriSecret.parity
        ? participant.seat
        : otherPlayer(participant.seat);

    this.assignCurrentSeatAsBlack(room, assignedBlack);

    room.nigiri = {
      status: 'resolved',
      commitment: nigiri.commitment,
      guesser: nigiri.guesser,
      guess,
      parity: room.nigiriSecret.parity,
      nonce: room.nigiriSecret.nonce,
      assignedBlack,
    };
    room.nigiriSecret = null;
    room.rematch = null;
    room.autoStartBlockedUntilSeatChange = false;

    this.logger.log(
      `[nigiri.resolve] resolved digital nigiri in room ${room.id} (guess=${guess}, parity=${room.nigiri.parity}, assignedBlack=${assignedBlack})`,
    );
  }

  requiresDigitalNigiri(settings: GameStartSettings): boolean {
    return (
      settings.mode === 'go' &&
      (settings.openingRule ?? GO_DIGITAL_NIGIRI_OPENING) ===
        GO_DIGITAL_NIGIRI_OPENING
    );
  }

  private assignCurrentSeatAsBlack(
    room: RoomRecord,
    assignedBlack: PlayerColor,
  ): void {
    if (assignedBlack === 'black') {
      return;
    }

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw this.roomsErrors.badRequest('room.error.both_seats_required');
    }

    black.seat = 'white';
    white.seat = 'black';
  }

  private ensureDirectGoSeats(room: RoomRecord): boolean {
    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (black && white) {
      return true;
    }

    if (!black && !white) {
      const host = this.store.getParticipantById(room, room.hostParticipantId);
      const guest = this.findFirstSeatCandidate(room, host.id);

      if (!guest) {
        return false;
      }

      host.seat = 'black';
      guest.seat = 'white';
      return true;
    }

    if (!black && white) {
      const candidate = this.findFirstSeatCandidate(room, white.id);

      if (!candidate) {
        return false;
      }

      candidate.seat = 'black';
      return true;
    }

    if (black && !white) {
      const candidate = this.findFirstSeatCandidate(room, black.id);

      if (!candidate) {
        return false;
      }

      candidate.seat = 'white';
      return true;
    }

    return false;
  }

  private findFirstSeatCandidate(
    room: RoomRecord,
    excludedParticipantId: string,
  ): ParticipantRecord | null {
    return (
      [...room.participants.values()].find(
        (participant) =>
          participant.id !== excludedParticipantId && !participant.seat,
      ) ?? null
    );
  }

  private createPendingNigiri(guesser: PlayerColor): {
    publicState: HostedNigiriPendingSnapshot;
    secret: {
      parity: NigiriGuess;
      nonce: string;
    };
  } {
    const parity: NigiriGuess = Math.random() < 0.5 ? 'odd' : 'even';
    const nonce = randomUUID();

    return {
      publicState: {
        status: 'pending',
        commitment: this.createNigiriCommitment(parity, nonce),
        guesser,
      },
      secret: {
        parity,
        nonce,
      },
    };
  }

  private createNigiriCommitment(parity: NigiriGuess, nonce: string): string {
    return createHash('sha256')
      .update(`gx.go:nigiri:${parity}:${nonce}`)
      .digest('hex');
  }

  private isNigiriGuess(value: unknown): value is NigiriGuess {
    return value === 'odd' || value === 'even';
  }
}
