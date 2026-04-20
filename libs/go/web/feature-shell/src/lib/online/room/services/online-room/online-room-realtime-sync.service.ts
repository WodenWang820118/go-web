import { Injectable, inject } from '@angular/core';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomSnapshotService } from '../online-room-snapshot/online-room-snapshot.service';
import { OnlineRoomSocketService } from '../online-room-socket/online-room-socket.service';
import {
  JOIN_ROOM_REQUIRED_MESSAGE,
  OnlineRoomRealtimeEvent,
  REALTIME_UNAVAILABLE_MESSAGE,
} from '../../contracts/online-room-service.contracts';
import { OnlineRoomSessionStateService } from './online-room-session-state.service';
import { OnlineRoomSessionWorkflowService } from './online-room-session-workflow.service';

/**
 * Synchronizes websocket events into local room state and guards outbound emits.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomRealtimeSyncService {
  private readonly i18n = inject(GoI18nService);
  private readonly snapshots = inject(OnlineRoomSnapshotService);
  private readonly socket = inject(OnlineRoomSocketService);
  private readonly state = inject(OnlineRoomSessionStateService);
  private readonly workflow = inject(OnlineRoomSessionWorkflowService);

  readonly connectionState = this.socket.connectionState;

  constructor() {
    this.bindRealtimeEvents();
  }

  emit(
    event: OnlineRoomRealtimeEvent,
    payload: Record<string, unknown> = {}
  ): void {
    const session = this.state.getSessionCredentials();

    if (!session) {
      this.state.setLastError(this.i18n.t(JOIN_ROOM_REQUIRED_MESSAGE));
      return;
    }

    const emitted = this.socket.emit(event, {
      roomId: session.roomId,
      participantToken: session.participantToken,
      ...payload,
    });

    if (!emitted) {
      this.state.setLastError(this.i18n.t(REALTIME_UNAVAILABLE_MESSAGE));
    }
  }

  private bindRealtimeEvents(): void {
    this.socket.roomSnapshot$.subscribe(snapshot => {
      this.state.setSnapshot(snapshot);
    });
    this.socket.roomPresence$.subscribe(event => {
      this.state.updateSnapshot(snapshot => this.snapshots.applyRoomPresence(snapshot, event));
    });
    this.socket.gameUpdated$.subscribe(event => {
      this.state.updateSnapshot(snapshot => this.snapshots.applyGameUpdated(snapshot, event));
    });
    this.socket.chatMessage$.subscribe(event => {
      this.state.updateSnapshot(snapshot => this.snapshots.applyChatMessage(snapshot, event));
    });
    this.socket.notice$.subscribe(event => {
      this.state.setLastSystemNotice(event.notice);
      this.state.setLastNotice(this.i18n.translateMessage(event.notice.message));
    });
    this.socket.commandError$.subscribe(event => {
      this.state.setLastError(this.i18n.translateMessage(event.message));
    });
    this.socket.roomClosed$.subscribe(event => {
      if (this.state.closingRoom() || event.roomId !== this.state.roomId()) {
        return;
      }

      this.workflow.markRoomClosed(event);
    });
  }
}
