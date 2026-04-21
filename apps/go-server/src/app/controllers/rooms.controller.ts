import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type {
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
} from '@gx/go/contracts';
import type { Request } from 'express';
import { CloseRoomDto, CreateRoomDto, JoinRoomDto } from './rooms.dtos';
import { RoomsLifecycleService } from '../features/rooms-lifecycle/rooms-lifecycle.service';
import { RoomsRealtimeBroadcasterService } from '../core/rooms-realtime/rooms-realtime-broadcaster.service';

/**
 * Exposes the hosted room REST API used by the Angular frontend.
 */
@Controller('rooms')
export class RoomsController {
  constructor(
    @Inject(RoomsLifecycleService)
    private readonly roomsLifecycleService: RoomsLifecycleService,
    @Inject(RoomsRealtimeBroadcasterService)
    private readonly realtime: RoomsRealtimeBroadcasterService,
  ) {}

  // #region Routes
  @Post()
  createRoom(
    @Body() body: CreateRoomDto,
    @Req() request: Request,
  ): CreateRoomResponse {
    return this.roomsLifecycleService.createRoom(
      body.displayName,
      this.requesterKey(request, 'create'),
    );
  }

  @Post(':roomId/join')
  joinRoom(
    @Param('roomId') roomId: string,
    @Body() body: JoinRoomDto,
    @Req() request: Request,
  ): JoinRoomResponse {
    return this.roomsLifecycleService.joinRoom(
      roomId,
      body.displayName,
      body.participantToken,
      this.requesterKey(request, `join:${roomId}`),
    );
  }

  @Post(':roomId/close')
  @HttpCode(204)
  closeRoom(@Param('roomId') roomId: string, @Body() body: CloseRoomDto): void {
    const closed = this.roomsLifecycleService.closeRoom(
      roomId,
      body.participantToken,
    );

    this.realtime.broadcastRoomClosed(closed.event);
    this.realtime.disconnectSockets(closed.socketIds, 50);
  }

  @Get()
  listRooms(): ListRoomsResponse {
    return this.roomsLifecycleService.listRooms();
  }

  @Get(':roomId')
  getRoom(@Param('roomId') roomId: string): GetRoomResponse {
    return this.roomsLifecycleService.getRoom(roomId);
  }
  // #endregion

  // #region Helpers
  private requesterKey(request: Request, action: string): string {
    return `${action}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
  }
  // #endregion
}
