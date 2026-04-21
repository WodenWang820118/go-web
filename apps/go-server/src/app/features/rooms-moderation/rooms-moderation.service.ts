import { Inject, Injectable } from '@nestjs/common';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { KickResult, MutationResult } from '../../contracts/rooms.types';

/**
 * Handles host-only moderation actions for hosted rooms.
 */
@Injectable()
export class RoomsModerationService {
  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsSnapshotMapper)
    private readonly snapshotMapper: RoomsSnapshotMapper,
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
  ) {}

  muteParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string,
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const host = this.store.assertHostParticipant(room, participantToken);
    const target = this.store.getParticipantById(room, targetParticipantId);

    if (target.isHost) {
      throw this.roomsErrors.badRequest('room.error.host_cannot_be_muted');
    }

    target.muted = true;
    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      notice: this.store.createNotice(
        this.roomsErrors.roomMessage('room.notice.participant_muted', {
          actorDisplayName: host.displayName,
          targetDisplayName: target.displayName,
        }),
      ),
    };
  }

  unmuteParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string,
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const host = this.store.assertHostParticipant(room, participantToken);
    const target = this.store.getParticipantById(room, targetParticipantId);

    target.muted = false;
    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      notice: this.store.createNotice(
        this.roomsErrors.roomMessage('room.notice.participant_unmuted', {
          actorDisplayName: host.displayName,
          targetDisplayName: target.displayName,
        }),
      ),
    };
  }

  kickParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string,
  ): KickResult {
    const room = this.store.getRoomRecord(roomId);
    const host = this.store.assertHostParticipant(room, participantToken);
    const target = this.store.getParticipantById(room, targetParticipantId);

    if (target.isHost) {
      throw this.roomsErrors.badRequest('room.error.host_cannot_be_kicked');
    }

    if (target.seat && room.match && room.match.state.phase !== 'finished') {
      throw this.roomsErrors.badRequest('room.error.cannot_kick_active_player');
    }

    const kickedSocketIds = [...target.socketIds];
    room.participants.delete(target.id);
    room.tokenIndex.delete(target.token);

    for (const socketId of kickedSocketIds) {
      this.store.socketIndex.delete(socketId);
    }

    if (this.store.isRoomOffline(room)) {
      room.emptySince ??= Date.now();
    }

    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      kickedSocketIds,
      notice: this.store.createNotice(
        this.roomsErrors.roomMessage('room.notice.participant_removed', {
          actorDisplayName: host.displayName,
          targetDisplayName: target.displayName,
        }),
      ),
    };
  }
}
