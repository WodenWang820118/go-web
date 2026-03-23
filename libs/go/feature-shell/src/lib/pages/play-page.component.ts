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
  getGameModeMeta,
  isGameMode,
  type BoardPoint,
} from '@org/go/domain';
import { GameSessionStore } from '@org/go/state';
import { GameBoardComponent, MatchSidebarComponent, StoneBadgeComponent } from '@org/go/ui';
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

const PLAY_PAGE_CONFIRMATIONS: Record<
  'resign' | 'restart' | 'newSetup',
  ConfirmationCopy
> = {
  resign: {
    header: 'Resign this match?',
    message: 'This will end the current local game immediately.',
    acceptLabel: 'Resign',
    rejectLabel: 'Keep playing',
  },
  restart: {
    header: 'Restart the current match?',
    message: 'Players and board settings stay the same, but the board resets.',
    acceptLabel: 'Restart',
    rejectLabel: 'Cancel',
  },
  newSetup: {
    header: 'Start a new setup?',
    message:
      'The current local board will be cleared and you will return to the setup screen.',
    acceptLabel: 'Go to setup',
    rejectLabel: 'Stay here',
  },
};

const PLAY_PAGE_TOASTS = {
  restarted: {
    severity: 'success' as const,
    summary: 'Match restarted',
    detail: 'The local board has been reset.',
  },
};

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
    return mode ? getGameModeMeta(mode) : null;
  });
  protected readonly settings = this.store.settings;
  protected readonly state = this.store.state;
  protected readonly lastPlacedPoint = computed(() => {
    const command = this.state()?.lastMove?.command;
    return command?.type === 'place' ? command.point : null;
  });
  protected readonly copy = PLAY_PAGE_CONFIRMATIONS;

  constructor() {
    effect(() => {
      if (this.state()?.phase === 'finished') {
        this.resultVisible.set(true);
      }
    });
  }

  protected onBoardPoint(point: BoardPoint): void {
    this.reportAction(this.store.playPoint(point), 'Move rejected');
  }

  protected passTurn(): void {
    this.reportAction(this.store.passTurn(), 'Pass unavailable');
  }

  protected finalizeScoring(): void {
    this.reportAction(this.store.finalizeScoring(), 'Scoring unavailable');
  }

  protected resignMatch(): void {
    this.confirmation.confirm({
      ...this.copy.resign,
      accept: () => {
        this.reportAction(this.store.resign(), 'Resignation unavailable');
      },
    });
  }

  protected restartMatch(): void {
    this.confirmation.confirm({
      ...this.copy.restart,
      accept: () => {
        if (this.store.restartMatch()) {
          this.resultVisible.set(false);
          this.messages.add(PLAY_PAGE_TOASTS.restarted);
        }
      },
    });
  }

  protected openNewMatchConfirm(): void {
    const mode = this.mode();

    this.confirmation.confirm({
      ...this.copy.newSetup,
      accept: async () => {
        this.store.clearMatch();
        this.resultVisible.set(false);
        await this.router.navigate(['/setup', mode ?? 'go']);
      },
    });
  }

  private reportAction(error: string | null, summary: string): void {
    if (!error) {
      return;
    }

    this.messages.add({
      severity: 'warn',
      summary,
      detail: error,
    });
  }
}
