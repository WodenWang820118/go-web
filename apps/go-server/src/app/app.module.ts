import { Module } from '@nestjs/common';
import { AppValidationPipeFactory } from './app-validation-pipe.factory';
import { RoomsErrorsService } from './core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from './core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from './core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsRealtimeBroadcasterService } from './core/rooms-realtime/rooms-realtime-broadcaster.service';
import { RoomsRequestKeyService } from './core/rooms-request/rooms-request-key.service';
import { RoomsStore } from './core/rooms-store/rooms-store.service';
import { AppController } from './controllers/app.controller';
import { RoomsController } from './controllers/rooms.controller';
import { RoomsGateway } from './controllers/rooms.gateway';
import { RoomsChatService } from './features/rooms-chat/rooms-chat.service';
import { RoomsDisplayNameService } from './features/rooms-lifecycle/rooms-display-name.service';
import { RoomsLifecycleService } from './features/rooms-lifecycle/rooms-lifecycle.service';
import { RoomsRequestThrottleService } from './features/rooms-lifecycle/rooms-request-throttle.service';
import { RoomsClockService } from './features/rooms-match/rooms-clock.service';
import { RoomsMatchClockCalculatorService } from './features/rooms-match/rooms-match-clock';
import { RoomsMatchNigiriService } from './features/rooms-match/rooms-match-nigiri.service';
import { RoomsMatchPolicyService } from './features/rooms-match/rooms-match-policy';
import { RoomsMatchService } from './features/rooms-match/rooms-match.service';
import { RoomsMatchSettingsService } from './features/rooms-match/rooms-match-settings';
import { RoomsMatchTransitionsService } from './features/rooms-match/rooms-match-transitions';
import { RoomsModerationService } from './features/rooms-moderation/rooms-moderation.service';

@Module({
  controllers: [AppController, RoomsController],
  providers: [
    AppValidationPipeFactory,
    RoomsErrorsService,
    RoomsStore,
    RoomsSnapshotMapper,
    RoomsRealtimeBroadcasterService,
    RoomsRequestKeyService,
    RoomsRulesEngineService,
    RoomsDisplayNameService,
    RoomsRequestThrottleService,
    RoomsLifecycleService,
    RoomsMatchSettingsService,
    RoomsMatchPolicyService,
    RoomsMatchClockCalculatorService,
    RoomsMatchNigiriService,
    RoomsMatchTransitionsService,
    RoomsClockService,
    RoomsMatchService,
    RoomsChatService,
    RoomsModerationService,
    RoomsGateway,
  ],
})
export class AppModule {}
