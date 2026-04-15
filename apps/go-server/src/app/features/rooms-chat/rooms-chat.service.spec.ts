import { BadRequestException, HttpException } from '@nestjs/common';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { RoomsLifecycleService } from '../rooms-lifecycle/rooms-lifecycle.service';

describe('RoomsChatService', () => {
  let lifecycle: RoomsLifecycleService;
  let chat: RoomsChatService;

  beforeEach(() => {
    const roomsErrors = new RoomsErrorsService();
    const store = new RoomsStore(roomsErrors);
    const snapshotMapper = new RoomsSnapshotMapper(store);

    lifecycle = new RoomsLifecycleService(store, snapshotMapper, roomsErrors);
    chat = new RoomsChatService(store, snapshotMapper, roomsErrors);
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
