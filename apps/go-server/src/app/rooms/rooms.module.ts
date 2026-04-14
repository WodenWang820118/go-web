import { Module } from '@nestjs/common';
import { RoomsChatService } from './services/rooms-chat.service';
import { RoomsController } from './rooms.controller';
import { RoomsGateway } from './rooms.gateway';
import { RoomsLifecycleService } from './services/rooms-lifecycle.service';
import { RoomsMatchService } from './services/rooms-match.service';
import { RoomsModerationService } from './services/rooms-moderation.service';
import { RoomsRulesEngineService } from './services/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from './rooms.snapshot.mapper';
import { RoomsService } from './services/rooms.service';
import { RoomsStore } from './rooms.store';

@Module({
  controllers: [RoomsController],
  providers: [
    RoomsStore,
    RoomsSnapshotMapper,
    RoomsRulesEngineService,
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
