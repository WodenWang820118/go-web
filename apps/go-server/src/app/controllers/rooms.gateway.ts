import {
  ConnectedSocket,
  OnGatewayInit,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ChatSendPayload,
  type GameCommandPayload,
  type GameRematchResponsePayload,
  type GameStartPayload,
  type HostModerationPayload,
  type RoomSettingsUpdatePayload,
  type RoomJoinPayload,
  type RoomSnapshot,
  type SeatClaimPayload,
  type SeatReleasePayload,
  type SystemNotice,
} from '@gx/go/contracts';
import { Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomsChatService } from '../features/rooms-chat/rooms-chat.service';
import { RoomsLifecycleService } from '../features/rooms-lifecycle/rooms-lifecycle.service';
import { RoomsMatchService } from '../features/rooms-match/rooms-match.service';
import { RoomsModerationService } from '../features/rooms-moderation/rooms-moderation.service';
import { RoomsRealtimeBroadcasterService } from '../core/rooms-realtime/rooms-realtime-broadcaster.service';
import { createCommandErrorEvent } from './rooms-gateway.errors';

/**
 * Bridges hosted room websocket events to the room facade and broadcast helpers.
 */
@WebSocketGateway({
  path: '/socket.io',
  cors: {
    origin: true,
  },
})
export class RoomsGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(RoomsLifecycleService)
    private readonly roomsLifecycleService: RoomsLifecycleService,
    @Inject(RoomsMatchService)
    private readonly roomsMatchService: RoomsMatchService,
    @Inject(RoomsChatService)
    private readonly roomsChatService: RoomsChatService,
    @Inject(RoomsModerationService)
    private readonly roomsModerationService: RoomsModerationService,
    @Inject(RoomsRealtimeBroadcasterService)
    private readonly realtime: RoomsRealtimeBroadcasterService
  ) {}

  afterInit(server: Server): void {
    this.realtime.registerServer(server);
  }

  // #region Connection lifecycle
  handleDisconnect(client: Socket): void {
    const snapshot = this.roomsLifecycleService.disconnectSocket(client.id);

    if (snapshot) {
      this.realtime.broadcastPresence(snapshot);
    }
  }

  @SubscribeMessage('room.join')
  handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomJoinPayload
  ): void {
    try {
      const previousSnapshot = this.roomsLifecycleService.disconnectSocket(
        client.id
      );

      if (previousSnapshot) {
        this.realtime.broadcastPresence(previousSnapshot);
      }

      for (const room of client.rooms) {
        if (room !== client.id) {
          void client.leave(room);
        }
      }

      const snapshot = this.roomsLifecycleService.connectParticipantSocket(
        payload.roomId,
        payload.participantToken,
        client.id
      );

      void client.join(this.roomChannel(snapshot.roomId));
      client.emit('room.snapshot', snapshot);
      this.realtime.broadcastPresence(snapshot);
    } catch (error) {
      this.emitCommandError(client, error);
    }
  }
  // #endregion

  // #region Seats and matches
  @SubscribeMessage('seat.claim')
  handleSeatClaim(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SeatClaimPayload
  ): void {
    this.handleMutation(
      client,
      () =>
        this.roomsMatchService.claimSeat(
          payload.roomId,
          payload.participantToken,
          payload.color
        ),
      true
    );
  }

  @SubscribeMessage('seat.release')
  handleSeatRelease(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SeatReleasePayload
  ): void {
    this.handleMutation(client, () =>
      this.roomsMatchService.releaseSeat(payload.roomId, payload.participantToken)
    );
  }

  @SubscribeMessage('game.start')
  handleGameStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameStartPayload
  ): void {
    this.handleMutation(
      client,
      () =>
        this.roomsMatchService.startMatch(
          payload.roomId,
          payload.participantToken,
          payload.settings
        ),
      true
    );
  }

  @SubscribeMessage('game.command')
  handleGameCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameCommandPayload
  ): void {
    this.handleMutation(
      client,
      () =>
        this.roomsMatchService.applyGameCommand(
          payload.roomId,
          payload.participantToken,
          payload.command
        ),
      true
    );
  }

  @SubscribeMessage('room.settings.update')
  handleRoomSettingsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomSettingsUpdatePayload
  ): void {
    this.handleMutation(client, () =>
      this.roomsMatchService.updateNextMatchSettings(
        payload.roomId,
        payload.participantToken,
        payload.settings
      )
    );
  }

  @SubscribeMessage('game.rematch.respond')
  handleGameRematchResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameRematchResponsePayload
  ): void {
    this.handleMutation(
      client,
      () =>
        this.roomsMatchService.respondToRematch(
          payload.roomId,
          payload.participantToken,
          payload.accepted
        ),
      true
    );
  }
  // #endregion

  // #region Chat and moderation
  @SubscribeMessage('chat.send')
  handleChatSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatSendPayload
  ): void {
    try {
      const result = this.roomsChatService.sendChatMessage(
        payload.roomId,
        payload.participantToken,
        payload.message
      );

      this.realtime.broadcastChatMessage(payload.roomId, result.message);
      this.realtime.broadcastMutationResult(result, {
        publishPresence: false,
      });
    } catch (error) {
      this.emitCommandError(client, error);
    }
  }

  @SubscribeMessage('host.mute')
  handleMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostModerationPayload
  ): void {
    this.handleMutation(client, () =>
      this.roomsModerationService.muteParticipant(
        payload.roomId,
        payload.participantToken,
        payload.targetParticipantId
      )
    );
  }

  @SubscribeMessage('host.unmute')
  handleUnmute(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostModerationPayload
  ): void {
    this.handleMutation(client, () =>
      this.roomsModerationService.unmuteParticipant(
        payload.roomId,
        payload.participantToken,
        payload.targetParticipantId
      )
    );
  }

  @SubscribeMessage('host.kick')
  handleKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostModerationPayload
  ): void {
    try {
      const result = this.roomsModerationService.kickParticipant(
        payload.roomId,
        payload.participantToken,
        payload.targetParticipantId
      );

      this.realtime.broadcastMutationResult(result, {
        disconnectSocketIds: result.kickedSocketIds,
      });
    } catch (error) {
      this.emitCommandError(client, error);
    }
  }
  // #endregion

  // #region Broadcasting
  private handleMutation(
    client: Socket,
    operation: () => {
      snapshot: RoomSnapshot;
      notice?: SystemNotice;
    },
    publishGameState = false
  ): void {
    try {
      const result = operation();

      this.realtime.broadcastMutationResult(result, {
        publishGameState,
      });
    } catch (error) {
      this.emitCommandError(client, error);
    }
  }
  // #endregion

  // #region Error handling
  /**
   * Converts Nest exceptions into the localized socket error payload expected by clients.
   */
  private emitCommandError(client: Socket, error: unknown): void {
    client.emit('command.error', createCommandErrorEvent(error));
  }

  private roomChannel(roomId: string): string {
    return `room:${roomId}`;
  }
  // #endregion
}
