import { Inject, Injectable } from '@nestjs/common';
import { ChatMessage } from '@gx/go/contracts';
import {
  CHAT_MESSAGES_PER_WINDOW,
  CHAT_WINDOW_MS,
  MAX_CHAT_LENGTH,
  MAX_CHAT_MESSAGES,
} from '../rooms.constants';
import {
  badRequestMessage,
  forbiddenMessage,
  throttledMessage,
} from '../rooms.errors';
import { RoomsSnapshotMapper } from '../rooms.snapshot.mapper';
import { RoomsStore } from '../rooms.store';
import { ChatResult } from '../rooms.types';

/**
 * Handles chat validation, throttling, and message persistence.
 */
@Injectable()
export class RoomsChatService {
  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsSnapshotMapper)
    private readonly snapshotMapper: RoomsSnapshotMapper
  ) {}

  sendChatMessage(
    roomId: string,
    participantToken: string,
    message: string
  ): ChatResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);

    if (participant.muted) {
      throw forbiddenMessage('room.error.you_are_muted');
    }

    const sanitizedMessage = this.sanitizeChatMessage(message);
    const now = Date.now();
    participant.chatTimestamps = participant.chatTimestamps.filter(
      timestamp => now - timestamp < CHAT_WINDOW_MS
    );

    if (participant.chatTimestamps.length >= CHAT_MESSAGES_PER_WINDOW) {
      throw throttledMessage('room.error.chat_rate_limited');
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
      throw badRequestMessage('room.error.chat_required');
    }

    if (normalized.length > MAX_CHAT_LENGTH) {
      throw badRequestMessage('room.error.chat_too_long', {
        max: MAX_CHAT_LENGTH,
      });
    }

    return normalized;
  }
}
