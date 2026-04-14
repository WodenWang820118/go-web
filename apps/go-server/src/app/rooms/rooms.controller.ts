import {
  Body,
  Controller,
  Get,
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
import { CreateRoomDto, JoinRoomDto } from './rooms.dtos';
import { RoomsService } from './services/rooms.service';

/**
 * Exposes the hosted room REST API used by the Angular frontend.
 */
@Controller('rooms')
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly roomsService: RoomsService) {}

  // #region Routes
  @Post()
  createRoom(
    @Body() body: CreateRoomDto,
    @Req() request: Request
  ): CreateRoomResponse {
    return this.roomsService.createRoom(
      body.displayName,
      this.requesterKey(request, 'create')
    );
  }

  @Post(':roomId/join')
  joinRoom(
    @Param('roomId') roomId: string,
    @Body() body: JoinRoomDto,
    @Req() request: Request
  ): JoinRoomResponse {
    return this.roomsService.joinRoom(
      roomId,
      body.displayName,
      body.participantToken,
      this.requesterKey(request, `join:${roomId}`)
    );
  }

  @Get()
  listRooms(): ListRoomsResponse {
    return this.roomsService.listRooms();
  }

  @Get(':roomId')
  getRoom(@Param('roomId') roomId: string): GetRoomResponse {
    return this.roomsService.getRoom(roomId);
  }
  // #endregion

  // #region Helpers
  private requesterKey(request: Request, action: string): string {
    return `${action}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
  }
  // #endregion
}
