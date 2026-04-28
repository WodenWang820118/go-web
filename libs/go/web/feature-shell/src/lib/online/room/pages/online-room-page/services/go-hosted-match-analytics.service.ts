import { effect, inject, Injectable } from '@angular/core';
import { buildGoAnalyticsLevelName, GoAnalyticsService } from '@gx/go/state';
import { OnlineRoomService } from '../../../services/online-room/online-room.service';

@Injectable()
export class GoHostedMatchAnalyticsService {
  private readonly analytics = inject(GoAnalyticsService);
  private readonly onlineRoom = inject(OnlineRoomService);
  private observedMatchStartedAt: string | null = null;

  constructor() {
    effect(() => {
      const match = this.onlineRoom.match();

      if (!match) {
        return;
      }

      if (
        this.observedMatchStartedAt &&
        this.observedMatchStartedAt !== match.startedAt
      ) {
        this.analytics.trackOnce(`hosted:start:rematch:${match.startedAt}`, {
          board_size: match.settings.boardSize,
          event: 'level_start',
          game_mode: match.settings.mode,
          level_name: buildGoAnalyticsLevelName(
            'hosted',
            match.settings.mode,
            match.settings.boardSize,
          ),
          play_context: 'hosted',
          start_source: 'rematch',
        });
      }

      this.observedMatchStartedAt = match.startedAt;

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
          event: 'level_end',
          game_mode: match.settings.mode,
          level_name: buildGoAnalyticsLevelName(
            'hosted',
            match.settings.mode,
            match.settings.boardSize,
          ),
          move_count: match.state.moveHistory.length,
          play_context: 'hosted',
          result_reason: result.reason,
          success: true,
          winner: result.winner,
        });
      }
    });
  }
}
