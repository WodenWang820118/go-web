import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
} from '@gx/go/domain';
import { GameSessionStore, GoI18nService } from '@gx/go/state';
import { GameBoardComponent, MatchSidebarComponent, StoneBadgeComponent } from '@gx/go/ui';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { map } from 'rxjs';

interface ConfirmationCopy {
  header: string;
  message: string;
  acceptLabel: string;
  rejectLabel: string;
}

@Component({
  selector: 'lib-go-play-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ConfirmDialogModule,
    DialogModule,
    DrawerModule,
    ToastModule,
    GameBoardComponent,
    MatchSidebarComponent,
    StoneBadgeComponent,
  ],
  templateUrl: './play-page.component.html',
  styleUrl: './play-page.component.css',
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayPageComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly store = inject(GameSessionStore);
  protected readonly helpVisible = signal(false);
  protected readonly resultVisible = signal(false);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  protected readonly mode = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('mode')),
      map(mode => (isGameMode(mode) ? mode : null))
    ),
    {
      initialValue: null,
    }
  );
  protected readonly meta = computed(() => {
    const mode = this.mode();
    return mode ? this.i18n.gameModeMeta(mode) : null;
  });
  protected readonly settings = this.store.settings;
  protected readonly state = this.store.state;
  protected readonly lastPlacedPoint = computed(() => {
    const command = this.state()?.lastMove?.command;
    return command?.type === 'place' ? command.point : null;
  });
  protected readonly copy = computed<Record<
    'resign' | 'restart' | 'newSetup',
    ConfirmationCopy
  >>(() => ({
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
    effect(() => {
      if (this.state()?.phase === 'finished') {
        this.resultVisible.set(true);
      }
    });
  }

  protected onBoardPoint(point: BoardPoint): void {
    this.reportAction(this.store.playPoint(point), 'play.toast.move_rejected');
  }

  protected passTurn(): void {
    this.reportAction(this.store.passTurn(), 'play.toast.pass_unavailable');
  }

  protected finalizeScoring(): void {
    this.reportAction(
      this.store.finalizeScoring(),
      'play.toast.scoring_unavailable'
    );
  }

  protected resignMatch(): void {
    this.confirmation.confirm({
      ...this.copy().resign,
      accept: () => {
        this.reportAction(
          this.store.resign(),
          'play.toast.resignation_unavailable'
        );
      },
    });
  }

  protected restartMatch(): void {
    this.confirmation.confirm({
      ...this.copy().restart,
      accept: () => {
        if (this.store.restartMatch()) {
          this.resultVisible.set(false);
          this.messages.add({
            severity: 'success',
            summary: this.i18n.t('play.toast.match_restarted.summary'),
            detail: this.i18n.t('play.toast.match_restarted.detail'),
          });
        }
      },
    });
  }

  protected openNewMatchConfirm(): void {
    const mode = this.mode();

    this.confirmation.confirm({
      ...this.copy().newSetup,
      accept: async () => {
        this.store.clearMatch();
        this.resultVisible.set(false);
        await this.router.navigate(['/setup', mode ?? 'go']);
      },
    });
  }

  protected translateMessage(
    message: GoMessageDescriptor | null | undefined
  ): string {
    return this.i18n.translateMessage(message);
  }

  private reportAction(
    error: GoMessageDescriptor | null,
    summaryKey: string
  ): void {
    if (!error) {
      return;
    }

    this.messages.add({
      severity: 'warn',
      summary: this.i18n.t(summaryKey),
      detail: this.i18n.translateMessage(error),
    });
  }
}
