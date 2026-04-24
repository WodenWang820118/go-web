import { effect, inject, Injectable } from '@angular/core';
import { GoAnalyticsService } from '@gx/go/state';
import { GameSessionStore } from '@gx/go/state/session';

@Injectable()
export class GoLocalMatchAnalyticsService {
  private readonly analytics = inject(GoAnalyticsService);
  private readonly store = inject(GameSessionStore);

  constructor() {
    effect(() => {
      const snapshot = this.store.snapshot();

      if (!snapshot) {
        return;
      }

      const firstMove = snapshot.state.moveHistory[0];

      if (firstMove) {
        this.analytics.trackOnce(`local:first-move:${firstMove.id}`, {
          board_size: snapshot.settings.boardSize,
          event: 'gx_match_first_move',
          game_mode: snapshot.settings.mode,
          play_context: 'local',
        });
      }

      const result = snapshot.state.result;

      if (snapshot.state.phase === 'finished' && result) {
        this.analytics.trackOnce(
          [
            'local:end',
            snapshot.settings.mode,
            snapshot.settings.boardSize,
            snapshot.state.moveHistory.length,
            result.reason,
            result.winner,
            snapshot.state.lastMove?.id ?? 'no-last-move',
          ].join(':'),
          {
            board_size: snapshot.settings.boardSize,
            event: 'gx_match_end',
            game_mode: snapshot.settings.mode,
            move_count: snapshot.state.moveHistory.length,
            play_context: 'local',
            result_reason: result.reason,
            winner: result.winner,
          },
        );
      }
    });
  }
}
