import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LobbyRoomSummary } from '@gx/go/contracts';
import { BoardSize, GameMode } from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { EMPTY, catchError, from, switchMap, take } from 'rxjs';
import { OnlineRoomService } from '../../../room/services/online-room/online-room.service';

@Injectable({ providedIn: 'root' })
export class OnlineLobbyRoomNavigationService {
  private readonly analytics = inject(GoAnalyticsService);
  private readonly onlineRoom = inject(OnlineRoomService);
  private readonly router = inject(Router);

  createRoom(displayName: string, mode: GameMode, boardSize: BoardSize): void {
    this.onlineRoom
      .createRoom(displayName, mode, boardSize)
      .pipe(
        switchMap((response) =>
          from(this.router.navigate(['/online/room', response.roomId])),
        ),
        catchError(() => EMPTY),
        take(1),
      )
      .subscribe();
  }

  joinRoom(room: LobbyRoomSummary, displayName: string): void {
    this.analytics.track({
      event: 'select_content',
      content_type: 'online_room',
      content_id: 'room_join',
      room_status: room.status,
    });
    this.onlineRoom
      .joinRoom(room.roomId, displayName, 'lobby')
      .pipe(
        switchMap(() =>
          from(this.router.navigate(['/online/room', room.roomId])),
        ),
        catchError(() => EMPTY),
        take(1),
      )
      .subscribe();
  }

  trackRoomOpen(room: LobbyRoomSummary): void {
    this.analytics.track({
      event: 'select_content',
      content_type: 'online_room',
      content_id: 'room_open',
      room_status: room.status,
    });
  }
}
