import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { createMessage } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { EMPTY, catchError, firstValueFrom, mapTo } from 'rxjs';
import { OnlineLobbyFlashNoticeService } from '../../../../../lobby/services/online-lobby-flash-notice/online-lobby-flash-notice.service';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { OnlineRoomsHttpService } from '../../../../services/online-rooms-http/online-rooms-http.service';
import { OnlineRoomPageViewStateService } from '../online-room-page-view-state/online-room-page-view-state.service';
import {
  buildRoomLeaveConfirmationState,
  canHandleRoomClosureProbe,
  RoomClosureProbeState,
  RoomLeaveConfirmationState,
  shouldInterceptHostLeave,
  shouldMarkClosedRoomFromMissingBootstrap,
  shouldProtectWindowUnload,
  shouldResetRoomClosureProbe,
  shouldScheduleRoomClosureProbe,
} from './online-room-page-leave.helpers';

const ROOM_CLOSURE_PROBE_DELAY_MS = 250;

@Injectable()
export class OnlineRoomPageLeaveService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(GoI18nService);
  private readonly flashNotice = inject(OnlineLobbyFlashNoticeService);
  private readonly onlineRoom = inject(OnlineRoomService);
  private readonly roomsApi = inject(OnlineRoomsHttpService);
  private readonly view = inject(OnlineRoomPageViewStateService);

  private readonly allowNextNavigationSignal = signal(false);
  private readonly leaveConfirmationSignal =
    signal<RoomLeaveConfirmationState | null>(null);
  private readonly leavingSignal = signal(false);
  private readonly hadRoomIdentitySignal = signal(false);
  private readonly roomClosureProbeArmedSignal = signal(false);
  private readonly roomClosureProbePendingSignal = signal(false);
  private readonly roomClosureProbeInFlightSignal = signal(false);
  private roomClosureProbeTimer: ReturnType<typeof setTimeout> | null = null;
  private roomClosureProbeRoomId: string | null = null;

  readonly leaveConfirmation = this.leaveConfirmationSignal.asReadonly();
  readonly leaving = this.leavingSignal.asReadonly();

  constructor() {
    this.bindWindowGuards();
    this.destroyRef.onDestroy(() => {
      this.resetRoomClosureProbe();
    });

    effect(() => {
      const roomClosed = this.onlineRoom.roomClosed();

      if (!roomClosed) {
        return;
      }

      this.onlineRoom.clearRoomClosedEvent();
      this.handleClosedRoomNotice(this.i18n.translateMessage(roomClosed.message));
    });

    effect(() => {
      if (
        this.onlineRoom.participantId() ||
        this.onlineRoom.participantToken() ||
        this.onlineRoom.connectionState() === 'connected'
      ) {
        this.hadRoomIdentitySignal.set(true);
      }
    });

    effect(() => {
      const probeState = this.getRoomClosureProbeState();

      if (shouldResetRoomClosureProbe(probeState)) {
        this.resetRoomClosureProbe();
        return;
      }

      if (shouldScheduleRoomClosureProbe(probeState) && probeState.currentRoomId) {
        this.scheduleRoomClosureProbe(probeState.currentRoomId);
      }
    });

    effect(() => {
      const roomId = this.view.roomId();

      if (
        !roomId ||
        !shouldMarkClosedRoomFromMissingBootstrap({
          roomId,
          bootstrapState: this.view.bootstrapState(),
          hasRoomIdentity: this.hadRoomIdentitySignal(),
          leaving: this.leavingSignal(),
          closingRoom: this.onlineRoom.closingRoom(),
          allowNextNavigation: this.allowNextNavigationSignal(),
        })
      ) {
        return;
      }

      this.onlineRoom.markRoomClosed({
        roomId,
        message: createMessage('room.notice.closed_by_host'),
      });
    });
  }

  requestBackToLobby(): void {
    if (!this.shouldInterceptHostLeave()) {
      void this.router.navigate(['/']);
      return;
    }

    this.openConfirmation('/');
  }

  canDeactivate(nextUrl: string | null): boolean {
    if (this.allowNextNavigationSignal() || !this.shouldInterceptHostLeave()) {
      return true;
    }

    this.openConfirmation(nextUrl ?? '/');
    return false;
  }

  cancelLeave(): void {
    if (this.leavingSignal()) {
      return;
    }

    this.leaveConfirmationSignal.set(null);
  }

  confirmLeave(): void {
    const confirmation = this.leaveConfirmation();

    if (!confirmation || this.leavingSignal()) {
      return;
    }

    this.leavingSignal.set(true);

    void firstValueFrom(this.onlineRoom.closeRoom())
      .then(async () => {
        this.flashNotice.show(this.i18n.t('lobby.notice.room_closed_self'));
        this.leaveConfirmationSignal.set(null);
        await this.navigateWithBypass(confirmation.targetUrl);
      })
      .catch(() => {
        // Room errors are surfaced through OnlineRoomService.lastError.
      })
      .finally(() => {
        this.leavingSignal.set(false);
      });
  }

  private bindWindowGuards(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const beforeUnloadListener = (event: BeforeUnloadEvent) => {
      if (!this.shouldProtectWindowUnload()) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };
    const pageHideListener = () => {
      if (!this.shouldProtectWindowUnload()) {
        return;
      }

      void this.onlineRoom.closeRoomWithKeepalive();
    };

    window.addEventListener('beforeunload', beforeUnloadListener);
    window.addEventListener('pagehide', pageHideListener);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('beforeunload', beforeUnloadListener);
      window.removeEventListener('pagehide', pageHideListener);
    });
  }

  private shouldInterceptHostLeave(): boolean {
    return shouldInterceptHostLeave({
      isHost: this.onlineRoom.isHost(),
      roomId: this.view.roomId(),
      participantToken: this.onlineRoom.participantToken(),
      bootstrapState: this.view.bootstrapState(),
    });
  }

  private shouldProtectWindowUnload(): boolean {
    return shouldProtectWindowUnload({
      isHost: this.onlineRoom.isHost(),
      roomId: this.view.roomId(),
      participantToken: this.onlineRoom.participantToken(),
      bootstrapState: this.view.bootstrapState(),
      leaving: this.leavingSignal(),
      closingRoom: this.onlineRoom.closingRoom(),
      allowNextNavigation: this.allowNextNavigationSignal(),
    });
  }

  private openConfirmation(targetUrl: string): void {
    this.leaveConfirmationSignal.set(
      buildRoomLeaveConfirmationState(this.i18n, targetUrl)
    );
  }

  private handleClosedRoomNotice(message: string): void {
    this.leaveConfirmationSignal.set(null);
    this.flashNotice.show(message);
    void this.navigateWithBypass('/');
  }

  private scheduleRoomClosureProbe(roomId: string): void {
    if (this.roomClosureProbeTimer || this.roomClosureProbeInFlightSignal()) {
      return;
    }

    this.roomClosureProbeRoomId = roomId;
    this.roomClosureProbeArmedSignal.set(true);
    this.roomClosureProbePendingSignal.set(true);
    this.roomClosureProbeTimer = setTimeout(() => {
      this.roomClosureProbeTimer = null;
      this.roomClosureProbePendingSignal.set(false);

      if (!this.canHandleRoomClosureProbe()) {
        if (this.roomClosureProbeRoomId === roomId) {
          this.roomClosureProbeRoomId = null;
        }

        return;
      }

      this.roomClosureProbeInFlightSignal.set(true);

      void firstValueFrom(
        this.roomsApi.getRoom(roomId).pipe(
          mapTo(false),
          catchError(error => {
            if (
              error instanceof HttpErrorResponse &&
              error.status === 404 &&
              this.canHandleRoomClosureProbe()
            ) {
              this.onlineRoom.markRoomClosed({
                roomId,
                message: createMessage('room.notice.closed_by_host'),
              });
            }

            return EMPTY;
          })
        )
      )
        .catch(() => {
          // ignore transport errors; reconnect UI handles transient disconnects
        })
        .finally(() => {
          this.roomClosureProbeInFlightSignal.set(false);

          if (this.roomClosureProbeRoomId === roomId) {
            this.roomClosureProbeRoomId = null;
          }
        });
    }, ROOM_CLOSURE_PROBE_DELAY_MS);
  }

  private resetRoomClosureProbe(): void {
    if (this.roomClosureProbeTimer) {
      clearTimeout(this.roomClosureProbeTimer);
      this.roomClosureProbeTimer = null;
    }

    this.roomClosureProbeArmedSignal.set(false);
    this.roomClosureProbePendingSignal.set(false);
    this.roomClosureProbeRoomId = null;
  }

  private canHandleRoomClosureProbe(): boolean {
    return canHandleRoomClosureProbe({
      activeProbeRoomId: this.roomClosureProbeRoomId,
      currentRoomId: this.view.roomId(),
      roomClosed: !!this.onlineRoom.roomClosed(),
      leaving: this.leavingSignal(),
      closingRoom: this.onlineRoom.closingRoom(),
      allowNextNavigation: this.allowNextNavigationSignal(),
    });
  }

  private async navigateWithBypass(targetUrl: string): Promise<void> {
    this.allowNextNavigationSignal.set(true);

    try {
      await this.router.navigateByUrl(targetUrl);
    } finally {
      this.allowNextNavigationSignal.set(false);
    }
  }

  private getRoomClosureProbeState(): RoomClosureProbeState {
    return {
      currentRoomId: this.view.roomId(),
      activeProbeRoomId: this.roomClosureProbeRoomId,
      connectionState: this.onlineRoom.connectionState(),
      hasRoomIdentity: this.hadRoomIdentitySignal(),
      roomClosed: !!this.onlineRoom.roomClosed(),
      leaving: this.leavingSignal(),
      closingRoom: this.onlineRoom.closingRoom(),
      allowNextNavigation: this.allowNextNavigationSignal(),
      probeArmed: this.roomClosureProbeArmedSignal(),
      probePending: this.roomClosureProbePendingSignal(),
      probeInFlight: this.roomClosureProbeInFlightSignal(),
    };
  }
}
