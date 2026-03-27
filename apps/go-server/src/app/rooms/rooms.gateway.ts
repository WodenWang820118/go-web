import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ChatSendPayload,
  type CommandErrorEvent,
  type GameCommandPayload,
  type GameUpdatedEvent,
  type GameStartPayload,
  type HostModerationPayload,
  type RoomJoinPayload,
  type RoomPresenceEvent,
  type RoomSnapshot,
  type SeatClaimPayload,
  type SeatReleasePayload,
  type SystemNotice,
  type SystemNoticeEvent,
} from '@gx/go/contracts';
import { createMessage, isMessageDescriptor } from '@gx/go/domain';
import { HttpException, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './rooms.service';

/**
 * Bridges hosted room websocket events to the room facade and broadcast helpers.
 */
@WebSocketGateway({
  path: '/socket.io',
  cors: {
    origin: true,
  },
})
export class RoomsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(@Inject(RoomsService) private readonly roomsService: RoomsService) {}

  // #region Connection lifecycle
  handleDisconnect(client: Socket): void {
    const snapshot = this.roomsService.disconnectSocket(client.id);

    if (snapshot) {
      this.broadcastPresence(snapshot);
    }
  }

  @SubscribeMessage('room.join')
  handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomJoinPayload
  ): void {
    try {
      const previousSnapshot = this.roomsService.disconnectSocket(client.id);

      if (previousSnapshot) {
        this.broadcastPresence(previousSnapshot);
      }

      for (const room of client.rooms) {
        if (room !== client.id) {
          void client.leave(room);
        }
      }

      const snapshot = this.roomsService.connectParticipantSocket(
        payload.roomId,
        payload.participantToken,
        client.id
      );

      void client.join(this.roomChannel(snapshot.roomId));
      client.emit('room.snapshot', snapshot);
      this.broadcastPresence(snapshot);
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
    this.handleMutation(client, () =>
      this.roomsService.claimSeat(
        payload.roomId,
        payload.participantToken,
        payload.color
      )
    );
  }

  @SubscribeMessage('seat.release')
  handleSeatRelease(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SeatReleasePayload
  ): void {
    this.handleMutation(client, () =>
      this.roomsService.releaseSeat(payload.roomId, payload.participantToken)
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
        this.roomsService.startMatch(
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
        this.roomsService.applyGameCommand(
          payload.roomId,
          payload.participantToken,
          payload.command
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
      const result = this.roomsService.sendChatMessage(
        payload.roomId,
        payload.participantToken,
        payload.message
      );

      this.server.to(this.roomChannel(payload.roomId)).emit('chat.message', {
        roomId: payload.roomId,
        message: result.message,
      });
      this.broadcastRoomSnapshot(result.snapshot);
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
      this.roomsService.muteParticipant(
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
      this.roomsService.unmuteParticipant(
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
      const result = this.roomsService.kickParticipant(
        payload.roomId,
        payload.participantToken,
        payload.targetParticipantId
      );

      this.broadcastRoomSnapshot(result.snapshot);
      this.broadcastPresence(result.snapshot);

      if (result.notice) {
        this.broadcastNotice(result.snapshot.roomId, result.notice);
      }

      for (const socketId of result.kickedSocketIds) {
        this.server.sockets.sockets.get(socketId)?.disconnect(true);
      }
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

      this.broadcastRoomSnapshot(result.snapshot);
      this.broadcastPresence(result.snapshot);

      if (publishGameState) {
        this.broadcastGameState(result.snapshot);
      }

      if (result.notice) {
        this.broadcastNotice(result.snapshot.roomId, result.notice);
      }
    } catch (error) {
      this.emitCommandError(client, error);
    }
  }

  private broadcastRoomSnapshot(snapshot: RoomSnapshot): void {
    this.server.to(this.roomChannel(snapshot.roomId)).emit(
      'room.snapshot',
      snapshot
    );
  }

  private broadcastPresence(snapshot: RoomSnapshot): void {
    const payload: RoomPresenceEvent = {
      roomId: snapshot.roomId,
      participants: snapshot.participants,
      seatState: snapshot.seatState,
    };

    this.server.to(this.roomChannel(snapshot.roomId)).emit(
      'room.presence',
      payload
    );
  }

  private broadcastGameState(snapshot: RoomSnapshot): void {
    const payload: GameUpdatedEvent = {
      roomId: snapshot.roomId,
      match: snapshot.match,
    };

    this.server.to(this.roomChannel(snapshot.roomId)).emit(
      'game.updated',
      payload
    );
  }

  private broadcastNotice(roomId: string, notice: SystemNotice): void {
    const payload: SystemNoticeEvent = {
      roomId,
      notice,
    };

    this.server.to(this.roomChannel(roomId)).emit('system.notice', payload);
  }
  // #endregion

  // #region Error handling
  /**
   * Converts Nest exceptions into the localized socket error payload expected by clients.
   */
  private emitCommandError(client: Socket, error: unknown): void {
    const payload: CommandErrorEvent = {
      code: 'internal_error',
      message: createMessage('room.error.unexpected_server_error'),
    };

    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message =
        typeof response === 'string'
          ? null
          : Array.isArray((response as { message?: unknown }).message)
            ? (response as { message: unknown[] }).message.find(isMessageDescriptor) ??
              null
            : isMessageDescriptor((response as { message?: unknown }).message)
              ? (response as { message: ReturnType<typeof createMessage> }).message
              : null;

      payload.code = String(error.getStatus());

      if (message) {
        payload.message = message;
      }
    }

    client.emit('command.error', payload);
  }

  private roomChannel(roomId: string): string {
    return `room:${roomId}`;
  }
  // #endregion
}
