import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
} from '@org/go/contracts';
import { GO_SERVER_ORIGIN } from '@org/go/state';
import { Observable } from 'rxjs';

/**
 * REST client for hosted multiplayer room endpoints.
 */
@Injectable({ providedIn: 'root' })
export class OnlineRoomsHttpService {
  private readonly http = inject(HttpClient);
  private readonly serverOrigin = inject(GO_SERVER_ORIGIN);
  private readonly apiBase = `${this.serverOrigin}/api/rooms`;

  listRooms(): Observable<ListRoomsResponse> {
    return this.http.get<ListRoomsResponse>(this.apiBase);
  }

  getRoom(roomId: string): Observable<GetRoomResponse> {
    return this.http.get<GetRoomResponse>(`${this.apiBase}/${roomId}`);
  }

  createRoom(displayName: string): Observable<CreateRoomResponse> {
    return this.http.post<CreateRoomResponse>(this.apiBase, {
      displayName,
    });
  }

  joinRoom(
    roomId: string,
    displayName: string,
    participantToken?: string
  ): Observable<JoinRoomResponse> {
    return this.http.post<JoinRoomResponse>(`${this.apiBase}/${roomId}/join`, {
      displayName,
      participantToken,
    });
  }

  describeHttpError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    if (Array.isArray(error.error?.message)) {
      return error.error.message.join(', ');
    }

    return error.message;
  }
}
