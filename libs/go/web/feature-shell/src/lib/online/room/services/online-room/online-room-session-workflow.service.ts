import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  cloneRoomSnapshot,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomClosedEvent,
} from '@gx/go/contracts';
import { BoardSize, GameMode } from '@gx/go/domain';
import {
  buildGoAnalyticsLevelName,
  GoAnalyticsErrorType,
  GoAnalyticsJoinSource,
  GoAnalyticsService,
} from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  defer,
  finalize,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { OnlineRoomIdentityService } from '../online-room-identity/online-room-identity.service';
import { OnlineRoomStorageService } from '../online-room-storage/online-room-storage.service';
import { OnlineRoomSocketService } from '../online-room-socket/online-room-socket.service';
import { OnlineRoomsHttpService } from '../online-rooms-http/online-rooms-http.service';
import { JOIN_ROOM_REQUIRED_MESSAGE } from '../../contracts/online-room-service.contracts';
import { OnlineRoomSessionStateService } from './online-room-session-state.service';

type JoinResponse = CreateRoomResponse | JoinRoomResponse;

/**
 * Coordinates REST-backed hosted-room session workflows.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomSessionWorkflowService {
  private readonly api = inject(OnlineRoomsHttpService);
  private readonly analytics = inject(GoAnalyticsService);
  private readonly i18n = inject(GoI18nService);
  private readonly identity = inject(OnlineRoomIdentityService);
  private readonly storage = inject(OnlineRoomStorageService);
  private readonly socket = inject(OnlineRoomSocketService);
  private readonly state = inject(OnlineRoomSessionStateService);
  private bootstrapSubscription: Subscription | null = null;

  bootstrapRoom(roomId: string): void {
    const normalizedRoomId = this.identity.normalizeRoomId(roomId);

    this.bootstrapSubscription?.unsubscribe();
    if (this.state.roomId() !== normalizedRoomId) {
      this.socket.disconnect();
    }

    this.state.resetForRoom(normalizedRoomId);
    this.state.setBootstrapState('loading');
    this.state.setLastError(null);

    const stored = this.storage.get(normalizedRoomId);

    this.bootstrapSubscription = this.api
      .getRoom(normalizedRoomId)
      .pipe(
        tap((response) => {
          this.state.setSnapshot(cloneRoomSnapshot(response.snapshot));
          this.state.setBootstrapState('ready');

          if (stored) {
            this.state.setDisplayName(stored.displayName);
          }
        }),
        switchMap(() => {
          if (!stored) {
            return of(void 0);
          }

          return this.api
            .joinRoom(
              normalizedRoomId,
              stored.displayName,
              stored.participantToken,
            )
            .pipe(
              tap((response) => {
                this.applyJoinResponse(
                  normalizedRoomId,
                  stored.displayName,
                  response,
                );
              }),
              map(() => void 0),
            );
        }),
        catchError((error) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.state.setBootstrapState('missing');
            this.state.setSnapshot(null);
            return EMPTY;
          }

          this.state.setBootstrapState('ready');
          this.state.setLastError(
            this.api.describeHttpError(
              error,
              'room.client.unexpected_network_error',
            ),
          );
          return EMPTY;
        }),
        finalize(() => {
          this.bootstrapSubscription = null;
        }),
      )
      .subscribe();
  }

  createRoom(
    displayName: string,
    mode: GameMode,
    boardSize: BoardSize,
  ): Observable<CreateRoomResponse> {
    return defer(() => {
      this.state.setCreating(true);
      this.state.setLastError(null);
      this.analytics.track({
        board_size: boardSize,
        event: 'gx_room_create_intent',
        game_mode: mode,
      });

      return this.api.createRoom(displayName, mode, boardSize).pipe(
        tap((response) => {
          this.applyJoinResponse(response.roomId, displayName, response);
          this.analytics.track({
            board_size: boardSize,
            event: 'gx_room_create',
            game_mode: mode,
          });
          this.analytics.track({
            board_size: boardSize,
            event: 'level_start',
            game_mode: mode,
            level_name: buildGoAnalyticsLevelName('hosted', mode, boardSize),
            play_context: 'hosted',
            start_source: 'room_create',
          });
        }),
        catchError((error) => {
          this.analytics.track({
            board_size: boardSize,
            error_type: describeAnalyticsError(error),
            event: 'gx_room_create_error',
            game_mode: mode,
          });
          this.state.setLastError(
            this.api.describeHttpError(
              error,
              'room.client.unexpected_network_error',
            ),
          );
          return throwError(() => error);
        }),
        finalize(() => {
          this.state.setCreating(false);
        }),
      );
    });
  }

  joinRoom(
    roomId: string,
    displayName: string,
    joinSource: GoAnalyticsJoinSource = 'direct_room',
  ): Observable<void> {
    return defer(() => {
      this.state.setJoining(true);
      this.state.setLastError(null);

      const normalizedRoomId = this.identity.normalizeRoomId(roomId);
      const stored = this.storage.get(normalizedRoomId);
      const resolvedDisplayName = this.identity.resolveJoinDisplayName(
        displayName,
        this.state.snapshot(),
        stored,
      );
      this.analytics.track({
        event: 'gx_room_join_intent',
        join_source: joinSource,
      });

      return this.api
        .joinRoom(
          normalizedRoomId,
          resolvedDisplayName,
          stored?.participantToken,
        )
        .pipe(
          tap((response) => {
            this.applyJoinResponse(
              normalizedRoomId,
              resolvedDisplayName,
              response,
            );
            this.analytics.track({
              event: 'join_group',
              group_id: 'online_room',
              join_source: joinSource,
            });
          }),
          map(() => void 0),
          catchError((error) => {
            this.analytics.track({
              error_type: describeAnalyticsError(error),
              event: 'gx_room_join_error',
              join_source: joinSource,
            });
            this.state.setLastError(
              this.api.describeHttpError(
                error,
                'room.client.unexpected_network_error',
              ),
            );
            return throwError(() => error);
          }),
          finalize(() => {
            this.state.setJoining(false);
          }),
        );
    });
  }

  closeRoom(): Observable<void> {
    return defer(() => {
      const closeRequest = this.resolveCloseRequest();

      if (!closeRequest) {
        return throwError(() => new Error(JOIN_ROOM_REQUIRED_MESSAGE));
      }

      this.state.setClosingRoom(true);
      this.state.setLastError(null);

      return this.api
        .closeRoom(closeRequest.roomId, closeRequest.participantToken)
        .pipe(
          tap(() => {
            this.clearClosedRoomState(closeRequest.roomId);
          }),
          catchError((error) => {
            this.state.setLastError(
              this.api.describeHttpError(
                error,
                'room.client.unexpected_network_error',
              ),
            );
            return throwError(() => error);
          }),
          finalize(() => {
            this.state.setClosingRoom(false);
          }),
        );
    });
  }

  async closeRoomWithKeepalive(): Promise<void> {
    const closeRequest = this.resolveCloseRequest();

    if (!closeRequest || typeof fetch !== 'function') {
      return;
    }

    try {
      await fetch(this.api.closeRoomUrl(closeRequest.roomId), {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantToken: closeRequest.participantToken,
        }),
      });
    } catch {
      // best-effort only during unload
    }
  }

  markRoomClosed(event: RoomClosedEvent): void {
    const activeRoomId = this.state.roomId();

    if (activeRoomId && event.roomId !== activeRoomId) {
      return;
    }

    this.clearClosedRoomState(event.roomId);
    this.state.setRoomClosed(event);
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  private applyJoinResponse(
    roomId: string,
    requestedDisplayName: string,
    response: JoinResponse,
  ): void {
    const resolvedDisplayName = this.identity.resolveResponseDisplayName(
      requestedDisplayName,
      response,
    );

    this.state.applyJoinResponse(roomId, resolvedDisplayName, response);

    const identity = this.identity.createStoredRoomIdentity(
      resolvedDisplayName,
      response,
    );
    this.storage.set(roomId, identity);
    this.socket.connect(roomId, response.participantToken);
  }

  private clearClosedRoomState(roomId: string): void {
    this.storage.clear(roomId);
    this.socket.disconnect();
    this.state.clearClosedRoomState();
  }

  private resolveCloseRequest(): {
    roomId: string;
    participantToken: string;
  } | null {
    const session = this.state.getSessionCredentials();

    if (!session) {
      this.state.setLastError(this.i18n.t(JOIN_ROOM_REQUIRED_MESSAGE));
      return null;
    }

    return session;
  }
}

function describeAnalyticsError(error: unknown): GoAnalyticsErrorType {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 404) {
      return 'not_found';
    }

    if (error.status === 0) {
      return 'network';
    }
  }

  return 'unexpected';
}
