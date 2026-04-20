import { Injectable, inject } from '@angular/core';
import {
  CreateRoomResponse,
  GameCommand,
  GameStartSettings,
  RoomClosedEvent,
} from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { Observable } from 'rxjs';
import { OnlineRoomRealtimeEvent } from '../../contracts/online-room-service.contracts';
import { OnlineRoomRealtimeSyncService } from './online-room-realtime-sync.service';
import { OnlineRoomSessionStateService } from './online-room-session-state.service';
import { OnlineRoomSessionWorkflowService } from './online-room-session-workflow.service';

/**
 * Frontend facade for a single hosted multiplayer room.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomService {
  private readonly realtime = inject(OnlineRoomRealtimeSyncService);
  private readonly state = inject(OnlineRoomSessionStateService);
  private readonly workflow = inject(OnlineRoomSessionWorkflowService);

  readonly roomId = this.state.roomId;
  readonly snapshot = this.state.snapshot;
  readonly participantId = this.state.participantId;
  readonly participantToken = this.state.participantToken;
  readonly displayName = this.state.displayName;
  readonly bootstrapState = this.state.bootstrapState;
  readonly connectionState = this.realtime.connectionState;
  readonly joining = this.state.joining;
  readonly creating = this.state.creating;
  readonly lastError = this.state.lastError;
  readonly lastNotice = this.state.lastNotice;
  readonly lastSystemNotice = this.state.lastSystemNotice;
  readonly roomClosed = this.state.roomClosed;
  readonly closingRoom = this.state.closingRoom;
  readonly participants = this.state.participants;
  readonly match = this.state.match;
  readonly chat = this.state.chat;
  readonly viewer = this.state.viewer;
  readonly nextMatchSettings = this.state.nextMatchSettings;
  readonly rematch = this.state.rematch;
  readonly autoStartBlockedUntilSeatChange =
    this.state.autoStartBlockedUntilSeatChange;
  readonly viewerSeat = this.state.viewerSeat;
  readonly isHost = this.state.isHost;
  readonly isMuted = this.state.isMuted;
  readonly isActivePlayer = this.state.isActivePlayer;
  readonly canInteractBoard = this.state.canInteractBoard;
  readonly canChangeSeats = this.state.canChangeSeats;
  readonly shareUrl = this.state.shareUrl;

  /**
   * Loads a hosted room and restores a saved participant identity when possible.
   */
  bootstrapRoom(roomId: string): void {
    this.workflow.bootstrapRoom(roomId);
  }

  createRoom(displayName: string): Observable<CreateRoomResponse> {
    return this.workflow.createRoom(displayName);
  }

  joinRoom(roomId: string, displayName: string): Observable<void> {
    return this.workflow.joinRoom(roomId, displayName);
  }

  closeRoom(): Observable<void> {
    return this.workflow.closeRoom();
  }

  async closeRoomWithKeepalive(): Promise<void> {
    await this.workflow.closeRoomWithKeepalive();
  }

  claimSeat(color: PlayerColor): void {
    this.emit('seat.claim', {
      color,
    });
  }

  releaseSeat(): void {
    this.emit('seat.release');
  }

  updateNextMatchSettings(settings: GameStartSettings): void {
    this.emit('room.settings.update', {
      settings,
    });
  }

  sendGameCommand(command: GameCommand): void {
    this.emit('game.command', {
      command,
    });
  }

  sendChat(message: string): void {
    this.emit('chat.send', {
      message,
    });
  }

  muteParticipant(targetParticipantId: string): void {
    this.emit('host.mute', {
      targetParticipantId,
    });
  }

  unmuteParticipant(targetParticipantId: string): void {
    this.emit('host.unmute', {
      targetParticipantId,
    });
  }

  kickParticipant(targetParticipantId: string): void {
    this.emit('host.kick', {
      targetParticipantId,
    });
  }

  respondToRematch(accepted: boolean): void {
    this.emit('game.rematch.respond', {
      accepted,
    });
  }

  clearTransientMessages(): void {
    this.state.clearTransientMessages();
  }

  clearRoomClosedEvent(): void {
    this.state.clearRoomClosedEvent();
  }

  markRoomClosed(event: RoomClosedEvent): void {
    this.workflow.markRoomClosed(event);
  }

  disconnect(): void {
    this.workflow.disconnect();
  }

  private emit(
    event: OnlineRoomRealtimeEvent,
    payload: Record<string, unknown> = {}
  ): void {
    this.realtime.emit(event, payload);
  }
}
