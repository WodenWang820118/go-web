import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
} from '@gx/go/contracts';
import { Request } from 'express';
import { CreateRoomDto, JoinRoomDto } from './rooms.dtos';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    @Inject(RoomsService) private readonly roomsService: RoomsService
  ) {}

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

  private requesterKey(request: Request, action: string): string {
    return `${action}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
  }
}
