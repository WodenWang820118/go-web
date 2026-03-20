import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsController } from './rooms/rooms.controller';
import { RoomsGateway } from './rooms/rooms.gateway';
import { RoomsService } from './rooms/rooms.service';

@Module({
  imports: [],
  controllers: [AppController, RoomsController],
  providers: [AppService, RoomsService, RoomsGateway],
})
export class AppModule {}
