import {
  CreateRoomResponse,
  GameCommand,
  GameStartSettings,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
  RoomSnapshot,
} from '@gx/go/contracts';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PlayerColor } from '@gx/go/domain';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLifecycleService } from './rooms-lifecycle.service';
import { RoomsMatchService } from './rooms-match.service';
import { RoomsModerationService } from './rooms-moderation.service';

/**
 * Public facade for hosted room operations used by the REST and websocket layers.
 */
@Injectable()
export class RoomsService implements OnModuleDestroy {
  constructor(
    @Inject(RoomsLifecycleService)
    private readonly lifecycle: RoomsLifecycleService,
    @Inject(RoomsMatchService)
    private readonly match: RoomsMatchService,
    @Inject(RoomsChatService)
    private readonly chat: RoomsChatService,
    @Inject(RoomsModerationService)
    private readonly moderation: RoomsModerationService
  ) {}

  // #region Lifecycle
  createRoom(displayName: string, requesterKey: string): CreateRoomResponse {
    return this.lifecycle.createRoom(displayName, requesterKey);
  }

  joinRoom(
    roomId: string,
    displayName: string,
    participantToken: string | undefined,
    requesterKey: string
  ): JoinRoomResponse {
    return this.lifecycle.joinRoom(
      roomId,
      displayName,
      participantToken,
      requesterKey
    );
  }

  getRoom(roomId: string): GetRoomResponse {
    return this.lifecycle.getRoom(roomId);
  }

  listRooms(): ListRoomsResponse {
    return this.lifecycle.listRooms();
  }

  connectParticipantSocket(
    roomId: string,
    participantToken: string,
    socketId: string
  ): RoomSnapshot {
    return this.lifecycle.connectParticipantSocket(
      roomId,
      participantToken,
      socketId
    );
  }

  disconnectSocket(socketId: string): RoomSnapshot | null {
    return this.lifecycle.disconnectSocket(socketId);
  }
  // #endregion

  // #region Match
  claimSeat(roomId: string, participantToken: string, color: PlayerColor) {
    return this.match.claimSeat(roomId, participantToken, color);
  }

  releaseSeat(roomId: string, participantToken: string) {
    return this.match.releaseSeat(roomId, participantToken);
  }

  updateNextMatchSettings(
    roomId: string,
    participantToken: string,
    settings: GameStartSettings
  ) {
    return this.match.updateNextMatchSettings(roomId, participantToken, settings);
  }

  startMatch(
    roomId: string,
    participantToken: string,
    settings: GameStartSettings
  ) {
    return this.match.startMatch(roomId, participantToken, settings);
  }

  applyGameCommand(
    roomId: string,
    participantToken: string,
    command: GameCommand
  ) {
    return this.match.applyGameCommand(roomId, participantToken, command);
  }

  respondToRematch(
    roomId: string,
    participantToken: string,
    accepted: boolean
  ) {
    return this.match.respondToRematch(roomId, participantToken, accepted);
  }
  // #endregion

  // #region Chat
  sendChatMessage(roomId: string, participantToken: string, message: string) {
    return this.chat.sendChatMessage(roomId, participantToken, message);
  }
  // #endregion

  // #region Moderation
  muteParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string
  ) {
    return this.moderation.muteParticipant(
      roomId,
      participantToken,
      targetParticipantId
    );
  }

  unmuteParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string
  ) {
    return this.moderation.unmuteParticipant(
      roomId,
      participantToken,
      targetParticipantId
    );
  }

  kickParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string
  ) {
    return this.moderation.kickParticipant(
      roomId,
      participantToken,
      targetParticipantId
    );
  }
  // #endregion

  onModuleDestroy(): void {
    this.lifecycle.onModuleDestroy();
  }
}
