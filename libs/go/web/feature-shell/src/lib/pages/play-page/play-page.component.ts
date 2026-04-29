import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  isGameMode,
  type GoMessageDescriptor,
  type BoardPoint,
  type PlayerColor,
  consumeTimeControlElapsed,
  type TimeControlClockState,
  type TimeControlPlayerClockState,
} from '@gx/go/domain';
import { GoAnalyticsMatchActionType, GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import {
  GameBoardComponent,
  MatchSidebarComponent,
  StoneBadgeComponent,
} from '@gx/go/ui';
import { map } from 'rxjs';
import { formatTimeControlClockPlayer } from '../../shared/time-control/time-control-presentation';
import { GoLocalMatchAnalyticsService } from './services/go-local-match-analytics.service';

interface ConfirmationCopy {
  header: string;
  message: string;
  acceptLabel: string;
  rejectLabel: string;
}

interface ConfirmationDialogState extends ConfirmationCopy {
  accept: () => void | Promise<void>;
}

interface PlayBanner {
  tone: 'success' | 'warn';
  summary: string;
  detail: string;
}

interface LocalClockView {
  color: PlayerColor;
  detail: string;
  isActive: boolean;
  label: string;
  playerName: string;
}

@Component({
  selector: 'lib-go-play-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GameBoardComponent,
    MatchSidebarComponent,
    StoneBadgeComponent,
  ],
  templateUrl: './play-page.component.html',
  styleUrl: './play-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GoLocalMatchAnalyticsService],
})
export class PlayPageComponent implements OnDestroy {
  protected readonly i18n = inject(GoI18nService);
  protected readonly store = inject(GameSessionStore);
  protected readonly helpVisible = signal(false);
  protected readonly resultVisible = signal(false);
  protected readonly confirmationState = signal<ConfirmationDialogState | null>(
    null,
  );
  protected readonly banner = signal<PlayBanner | null>(null);
  private readonly now = signal(Date.now());
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private readonly clockTickerEffect = effect(() => {
    if (this.hasTickingClock()) {
      this.startClockTimer();
      return;
    }

    this.stopClockTimer();
  });

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analytics = inject(GoAnalyticsService);
  private readonly localMatchAnalytics = inject(GoLocalMatchAnalyticsService);

  protected readonly mode = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('mode')),
      map((mode) => (isGameMode(mode) ? mode : null)),
    ),
    {
      initialValue: null,
    },
  );
  protected readonly meta = computed(() => {
    const mode = this.mode();
    return mode ? this.i18n.gameModeMeta(mode) : null;
  });
  protected readonly settings = this.store.settings;
  protected readonly state = this.store.state;
  protected readonly localClockViews = computed<LocalClockView[]>(() => {
    const snapshot = this.store.snapshot();

    if (!snapshot?.clock) {
      return [];
    }

    return (['black', 'white'] as const).map((color) => {
      const player = this.getProjectedClockPlayer(snapshot.clock!, color);
      const display = formatTimeControlClockPlayer(
        player,
        snapshot.clock!.config,
        this.i18n,
      );

      return {
        color,
        detail: display.detail,
        isActive:
          snapshot.state.phase === 'playing' &&
          snapshot.clock!.activeColor === color,
        label: display.label,
        playerName: snapshot.settings.players[color],
      };
    });
  });
  protected readonly lastPlacedPoint = computed(() => {
    const command = this.state()?.lastMove?.command;
    return command?.type === 'place' ? command.point : null;
  });
  protected readonly copy = computed<
    Record<'resign' | 'restart' | 'newSetup', ConfirmationCopy>
  >(() => ({
    resign: {
      header: this.i18n.t('play.confirm.resign.header'),
      message: this.i18n.t('play.confirm.resign.message'),
      acceptLabel: this.i18n.t('play.confirm.resign.accept'),
      rejectLabel: this.i18n.t('play.confirm.resign.reject'),
    },
    restart: {
      header: this.i18n.t('play.confirm.restart.header'),
      message: this.i18n.t('play.confirm.restart.message'),
      acceptLabel: this.i18n.t('play.confirm.restart.accept'),
      rejectLabel: this.i18n.t('play.confirm.restart.reject'),
    },
    newSetup: {
      header: this.i18n.t('play.confirm.new_setup.header'),
      message: this.i18n.t('play.confirm.new_setup.message'),
      acceptLabel: this.i18n.t('play.confirm.new_setup.accept'),
      rejectLabel: this.i18n.t('play.confirm.new_setup.reject'),
    },
  }));

  constructor() {
    void this.localMatchAnalytics;

    effect(() => {
      if (this.state()?.phase === 'finished') {
        this.resultVisible.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopClockTimer();
  }

  protected onBoardPoint(point: BoardPoint): void {
    this.reportAction(this.store.playPoint(point), 'play.toast.move_rejected');
  }

  protected passTurn(): void {
    const error = this.store.passTurn();
    if (!error) {
      this.trackLocalMatchAction('pass');
    }

    this.reportAction(error, 'play.toast.pass_unavailable');
  }

  protected confirmScoring(player: PlayerColor): void {
    const error = this.store.confirmScoring(player);
    if (!error) {
      this.trackLocalMatchAction('confirm_scoring');
    }

    this.reportAction(error, 'play.toast.scoring_unavailable');
  }

  protected disputeScoring(player: PlayerColor): void {
    const error = this.store.disputeScoring(player);
    if (!error) {
      this.trackLocalMatchAction('dispute_scoring');
    }

    this.reportAction(error, 'play.toast.scoring_unavailable');
  }

  protected resignMatch(): void {
    this.openConfirmation('resign', () => {
      const error = this.store.resign();
      if (!error) {
        this.trackLocalMatchAction('resign');
      }

      this.reportAction(error, 'play.toast.resignation_unavailable');
    });
  }

  protected restartMatch(): void {
    this.openConfirmation('restart', () => {
      if (this.store.restartMatch()) {
        this.trackLocalMatchAction('restart');
        this.resultVisible.set(false);
        this.setBanner(
          'success',
          this.i18n.t('play.toast.match_restarted.summary'),
          this.i18n.t('play.toast.match_restarted.detail'),
        );
      }
    });
  }

  protected openNewMatchConfirm(): void {
    const mode = this.mode();

    this.openConfirmation('newSetup', async () => {
      this.trackLocalMatchAction('new_setup');
      this.store.clearMatch();
      this.resultVisible.set(false);
      await this.router.navigate(['/setup', mode ?? 'go']);
    });
  }

  protected closeHelp(): void {
    this.helpVisible.set(false);
  }

  protected closeResult(): void {
    this.resultVisible.set(false);
  }

  protected cancelConfirmation(): void {
    this.confirmationState.set(null);
  }

  protected confirmAction(): void {
    const confirmation = this.confirmationState();

    if (!confirmation) {
      return;
    }

    this.confirmationState.set(null);
    void confirmation.accept();
  }

  protected clearBanner(): void {
    this.banner.set(null);
  }

  protected translateMessage(
    message: GoMessageDescriptor | null | undefined,
  ): string {
    return this.i18n.translateMessage(message);
  }

  private reportAction(
    error: GoMessageDescriptor | null,
    summaryKey: string,
  ): void {
    if (!error) {
      return;
    }

    this.setBanner(
      'warn',
      this.i18n.t(summaryKey),
      this.i18n.translateMessage(error),
    );
  }

  private openConfirmation(
    key: 'resign' | 'restart' | 'newSetup',
    accept: () => void | Promise<void>,
  ): void {
    this.confirmationState.set({
      ...this.copy()[key],
      accept,
    });
  }

  private setBanner(
    tone: PlayBanner['tone'],
    summary: string,
    detail: string,
  ): void {
    this.banner.set({
      tone,
      summary,
      detail,
    });
  }

  private trackLocalMatchAction(actionType: GoAnalyticsMatchActionType): void {
    this.analytics.track({
      action_type: actionType,
      event: 'gx_match_action',
      game_mode: this.settings()?.mode ?? this.mode() ?? undefined,
      play_context: 'local',
    });
  }

  private getProjectedClockPlayer(
    clock: TimeControlClockState,
    color: PlayerColor,
  ): TimeControlPlayerClockState {
    const player = clock.players[color];
    const snapshot = this.store.snapshot();

    if (
      !snapshot ||
      snapshot.state.phase !== 'playing' ||
      clock.activeColor !== color
    ) {
      return player;
    }

    return consumeTimeControlElapsed(
      player,
      clock.config,
      Math.max(0, this.now() - Date.parse(clock.lastStartedAt)),
    );
  }

  private hasTickingClock(): boolean {
    const snapshot = this.store.snapshot();

    return !!snapshot?.clock && snapshot.state.phase === 'playing';
  }

  private startClockTimer(): void {
    if (this.clockTimer) {
      return;
    }

    this.clockTimer = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  private stopClockTimer(): void {
    if (!this.clockTimer) {
      return;
    }

    clearInterval(this.clockTimer);
    this.clockTimer = null;
  }
}
