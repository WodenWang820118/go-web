import { Module } from '@nestjs/common';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsController } from './rooms.controller';
import { RoomsGateway } from './rooms.gateway';
import { RoomsLifecycleService } from './rooms-lifecycle.service';
import { RoomsMatchService } from './rooms-match.service';
import { RoomsModerationService } from './rooms-moderation.service';
import { RoomsSnapshotMapper } from './rooms.snapshot.mapper';
import { RoomsService } from './rooms.service';
import { RoomsStore } from './rooms.store';

@Module({
  controllers: [RoomsController],
  providers: [
    RoomsStore,
    RoomsSnapshotMapper,
    RoomsLifecycleService,
    RoomsMatchService,
    RoomsChatService,
    RoomsModerationService,
    RoomsService,
    RoomsGateway,
  ],
  exports: [RoomsService],
})
export class RoomsModule {}
