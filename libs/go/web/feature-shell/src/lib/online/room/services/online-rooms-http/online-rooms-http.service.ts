import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CloseRoomRequest,
  CreateRoomRequest,
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomResponse,
  LocalizedErrorResponse,
  ListRoomsResponse,
} from '@gx/go/contracts';
import { isMessageDescriptor } from '@gx/go/domain';
import { BoardSize, GameMode } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GO_SERVER_ORIGIN } from '@gx/go/state/server-origin';
import { Observable } from 'rxjs';

/**
 * REST client for hosted multiplayer room endpoints.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomsHttpService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(GoI18nService);
  private readonly serverOrigin = inject(GO_SERVER_ORIGIN);
  private readonly apiBase = `${this.serverOrigin}/api/rooms`;

  listRooms(): Observable<ListRoomsResponse> {
    return this.http.get<ListRoomsResponse>(this.apiBase);
  }

  getRoom(roomId: string): Observable<GetRoomResponse> {
    return this.http.get<GetRoomResponse>(`${this.apiBase}/${roomId}`);
  }

  createRoom(
    displayName: string,
    mode: GameMode,
    boardSize: BoardSize,
  ): Observable<CreateRoomResponse> {
    return this.http.post<CreateRoomResponse>(this.apiBase, {
      displayName,
      mode,
      boardSize,
    } satisfies CreateRoomRequest);
  }

  joinRoom(
    roomId: string,
    displayName: string,
    participantToken?: string,
  ): Observable<JoinRoomResponse> {
    return this.http.post<JoinRoomResponse>(`${this.apiBase}/${roomId}/join`, {
      displayName,
      participantToken,
    });
  }

  closeRoom(roomId: string, participantToken: string): Observable<void> {
    return this.http.post<void>(this.closeRoomUrl(roomId), {
      participantToken,
    } satisfies CloseRoomRequest);
  }

  closeRoomUrl(roomId: string): string {
    return `${this.apiBase}/${roomId}/close`;
  }

  describeHttpError(error: unknown, fallbackKey: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return this.i18n.t(fallbackKey);
    }

    const response = error.error as LocalizedErrorResponse | undefined;
    const message = response?.message;

    if (isMessageDescriptor(message)) {
      return this.i18n.translateMessage(message);
    }

    if (Array.isArray(message)) {
      return message.map((item) => this.i18n.translateMessage(item)).join(', ');
    }

    if (typeof error.message === 'string' && error.message.length > 0) {
      return error.message;
    }

    return this.i18n.t(fallbackKey);
  }
}
