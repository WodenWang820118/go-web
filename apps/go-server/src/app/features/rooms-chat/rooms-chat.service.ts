import { Inject, Injectable } from '@nestjs/common';
import { ChatMessage } from '@gx/go/contracts';
import {
  CHAT_MESSAGES_PER_WINDOW,
  CHAT_WINDOW_MS,
  MAX_CHAT_LENGTH,
  MAX_CHAT_MESSAGES,
} from '../../core/rooms-config/rooms.constants';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { ChatResult } from '../../contracts/rooms.types';

/**
 * Handles chat validation, throttling, and message persistence.
 */
@Injectable()
export class RoomsChatService {
  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsSnapshotMapper)
    private readonly snapshotMapper: RoomsSnapshotMapper,
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService
  ) {}

  sendChatMessage(
    roomId: string,
    participantToken: string,
    message: string
  ): ChatResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);

    if (participant.muted) {
      throw this.roomsErrors.forbidden('room.error.you_are_muted');
    }

    const sanitizedMessage = this.sanitizeChatMessage(message);
    const now = Date.now();
    participant.chatTimestamps = participant.chatTimestamps.filter(
      timestamp => now - timestamp < CHAT_WINDOW_MS
    );

    if (participant.chatTimestamps.length >= CHAT_MESSAGES_PER_WINDOW) {
      throw this.roomsErrors.throttled('room.error.chat_rate_limited');
    }

    participant.chatTimestamps.push(now);

    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      participantId: participant.id,
      displayName: participant.displayName,
      message: sanitizedMessage,
      sentAt: this.store.timestamp(),
      system: false,
    };

    room.chat.push(chatMessage);
    room.chat = room.chat.slice(-MAX_CHAT_MESSAGES);
    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      message: chatMessage,
    };
  }

  private sanitizeChatMessage(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      throw this.roomsErrors.badRequest('room.error.chat_required');
    }

    if (normalized.length > MAX_CHAT_LENGTH) {
      throw this.roomsErrors.badRequest('room.error.chat_too_long', {
        max: MAX_CHAT_LENGTH,
      });
    }

    return normalized;
  }
}
