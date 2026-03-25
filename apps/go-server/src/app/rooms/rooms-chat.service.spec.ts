import { BadRequestException, HttpException } from '@nestjs/common';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLifecycleService } from './rooms-lifecycle.service';
import { RoomsSnapshotMapper } from './rooms.snapshot.mapper';
import { RoomsStore } from './rooms.store';

describe('RoomsChatService', () => {
  let lifecycle: RoomsLifecycleService;
  let chat: RoomsChatService;

  beforeEach(() => {
    const store = new RoomsStore();
    const snapshotMapper = new RoomsSnapshotMapper(store);

    lifecycle = new RoomsLifecycleService(store, snapshotMapper);
    chat = new RoomsChatService(store, snapshotMapper);
  });

  afterEach(() => {
    lifecycle.onModuleDestroy();
  });

  it('rate limits bursty chat traffic', () => {
    const host = lifecycle.createRoom('Host', 'create:test');

    for (let index = 0; index < 5; index += 1) {
      chat.sendChatMessage(host.roomId, host.participantToken, `Hello ${index}`);
    }

    expect(() =>
      chat.sendChatMessage(host.roomId, host.participantToken, 'Too much')
    ).toThrow(HttpException);
  });

  it('rejects empty chat messages', () => {
    const host = lifecycle.createRoom('Host', 'create:test');

    expect(() =>
      chat.sendChatMessage(host.roomId, host.participantToken, '   ')
    ).toThrow(BadRequestException);
  });
});
