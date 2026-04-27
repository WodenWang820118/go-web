import { effect, inject, Injectable } from '@angular/core';
import { GoAnalyticsService } from '@gx/go/state';
import { OnlineRoomService } from '../../../services/online-room/online-room.service';

@Injectable()
export class GoHostedMatchAnalyticsService {
  private readonly analytics = inject(GoAnalyticsService);
  private readonly onlineRoom = inject(OnlineRoomService);

  constructor() {
    effect(() => {
      const match = this.onlineRoom.match();

      if (!match) {
        return;
      }

      const firstMove = match.state.moveHistory[0];

      if (firstMove) {
        this.analytics.trackOnce(`hosted:first-move:${match.startedAt}`, {
          board_size: match.settings.boardSize,
          event: 'gx_match_first_move',
          game_mode: match.settings.mode,
          play_context: 'hosted',
        });
      }

      const result = match.state.result;

      if (match.state.phase === 'finished' && result) {
        this.analytics.trackOnce(`hosted:end:${match.startedAt}`, {
          board_size: match.settings.boardSize,
          event: 'gx_match_end',
          game_mode: match.settings.mode,
          move_count: match.state.moveHistory.length,
          play_context: 'hosted',
          result_reason: result.reason,
          winner: result.winner,
        });
      }
    });
  }
}
