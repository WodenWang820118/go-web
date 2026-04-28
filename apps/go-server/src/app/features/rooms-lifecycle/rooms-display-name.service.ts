import { createUniqueDisplayName } from '@gx/go/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { MAX_DISPLAY_NAME_LENGTH } from '../../core/rooms-config/rooms.constants';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import type { ParticipantRecord } from '../../contracts/rooms.types';

@Injectable()
export class RoomsDisplayNameService {
  constructor(
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
  ) {}

  sanitize(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      throw this.roomsErrors.badRequest('room.error.display_name_required');
    }

    if (normalized.length > MAX_DISPLAY_NAME_LENGTH) {
      throw this.roomsErrors.badRequest('room.error.display_name_too_long', {
        max: MAX_DISPLAY_NAME_LENGTH,
      });
    }

    return normalized;
  }

  uniqueForParticipants(
    displayName: string,
    participants: Iterable<ParticipantRecord>,
    excludedParticipantId: string | null,
  ): string {
    return createUniqueDisplayName(
      this.sanitize(displayName),
      [...participants]
        .filter((participant) => participant.id !== excludedParticipantId)
        .map((participant) => participant.displayName),
    );
  }
}
