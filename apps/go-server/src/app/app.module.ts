import { Module } from '@nestjs/common';
import { RoomsErrorsService } from './core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from './core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from './core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsRealtimeBroadcasterService } from './core/rooms-realtime/rooms-realtime-broadcaster.service';
import { RoomsStore } from './core/rooms-store/rooms-store.service';
import { AppController } from './controllers/app.controller';
import { RoomsController } from './controllers/rooms.controller';
import { RoomsGateway } from './controllers/rooms.gateway';
import { RoomsChatService } from './features/rooms-chat/rooms-chat.service';
import { RoomsLifecycleService } from './features/rooms-lifecycle/rooms-lifecycle.service';
import { RoomsClockService } from './features/rooms-match/rooms-clock.service';
import { RoomsMatchService } from './features/rooms-match/rooms-match.service';
import { RoomsModerationService } from './features/rooms-moderation/rooms-moderation.service';

@Module({
  controllers: [AppController, RoomsController],
  providers: [
    RoomsErrorsService,
    RoomsStore,
    RoomsSnapshotMapper,
    RoomsRealtimeBroadcasterService,
    RoomsRulesEngineService,
    RoomsLifecycleService,
    RoomsClockService,
    RoomsMatchService,
    RoomsChatService,
    RoomsModerationService,
    RoomsGateway,
  ],
})
export class AppModule {}
