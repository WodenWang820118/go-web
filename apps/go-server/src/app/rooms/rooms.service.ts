import {
  CreateRoomResponse,
  GameCommand,
  GameStartSettings,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
  RoomSnapshot,
} from '@gx/go/contracts';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PlayerColor } from '@gx/go/domain';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLifecycleService } from './rooms-lifecycle.service';
import { RoomsMatchService } from './rooms-match.service';
import { RoomsModerationService } from './rooms-moderation.service';
import { RoomsSnapshotMapper } from './rooms.snapshot.mapper';
import { RoomsStore } from './rooms.store';

/**
 * Public facade for hosted room operations used by the REST and websocket layers.
 */
@Injectable()
export class RoomsService implements OnModuleDestroy {
  private readonly lifecycle: RoomsLifecycleService;
  private readonly match: RoomsMatchService;
  private readonly chat: RoomsChatService;
  private readonly moderation: RoomsModerationService;

  constructor(
    lifecycle?: RoomsLifecycleService,
    match?: RoomsMatchService,
    chat?: RoomsChatService,
    moderation?: RoomsModerationService,
    store?: RoomsStore,
    snapshotMapper?: RoomsSnapshotMapper
  ) {
    const resolvedStore = store ?? new RoomsStore();
    const resolvedSnapshotMapper =
      snapshotMapper ?? new RoomsSnapshotMapper(resolvedStore);

    this.lifecycle =
      lifecycle ??
      new RoomsLifecycleService(resolvedStore, resolvedSnapshotMapper);
    this.match =
      match ?? new RoomsMatchService(resolvedStore, resolvedSnapshotMapper);
    this.chat =
      chat ?? new RoomsChatService(resolvedStore, resolvedSnapshotMapper);
    this.moderation =
      moderation ??
      new RoomsModerationService(resolvedStore, resolvedSnapshotMapper);
  }

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
