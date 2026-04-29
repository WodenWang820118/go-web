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
import { RoomsRequestKeyService } from '../core/rooms-request/rooms-request-key.service';

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
    @Inject(RoomsRequestKeyService)
    private readonly requestKeys: RoomsRequestKeyService,
  ) {}

  // #region Routes
  @Post()
  createRoom(
    @Body() body: CreateRoomDto,
    @Req() request: Request,
  ): CreateRoomResponse {
    return this.roomsLifecycleService.createRoom(
      body.displayName,
      this.requestKeys.fromRequest(request, 'create'),
      {
        mode: body.mode,
        boardSize: body.boardSize,
        goRules: body.goRules,
        timeControl: body.timeControl,
      },
    );
  }

  @Post(':roomId/join')
  joinRoom(
    @Param('roomId') roomId: string,
    @Body() body: JoinRoomDto,
    @Req() request: Request,
  ): JoinRoomResponse {
    const result = this.roomsLifecycleService.joinRoomMutation(
      roomId,
      body.displayName,
      body.participantToken,
      this.requestKeys.fromRequest(request, `join:${roomId}`),
    );

    this.realtime.broadcastMutationResult({
      snapshot: result.response.snapshot,
      notice: result.notice,
    });

    return result.response;
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
}
