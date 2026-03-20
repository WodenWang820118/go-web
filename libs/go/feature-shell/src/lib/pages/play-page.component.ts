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
  template: `
    @if (meta() && state() && settings()) {
      <p-toast />
      <p-confirmdialog />

      <section class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a
              [routerLink]="['/setup', mode()]"
              class="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500 transition hover:text-stone-900"
            >
              &larr; Back to setup
            </a>
            <h1 class="mt-3 text-3xl font-semibold text-stone-950 sm:text-4xl">
              {{ meta()!.title }}
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {{ state()!.message }}
            </p>
          </div>

          <div class="rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm text-stone-600 shadow-sm backdrop-blur">
            Current turn:
            <span class="ml-2 inline-flex items-center gap-2 font-semibold text-stone-900">
              <lib-go-stone-badge [color]="state()!.nextPlayer" />
              {{ store.currentPlayerName() }}
            </span>
          </div>
        </div>

        @if (state()!.phase === 'scoring') {
          <div class="mt-6 rounded-[1.5rem] border border-amber-300/50 bg-amber-100/80 px-5 py-4 text-sm text-amber-950 shadow-sm">
            Click stones on the board to mark dead groups, then use the sidebar to
            finalize the score.
          </div>
        }

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div class="rounded-[2rem] border border-stone-200/80 bg-white/80 p-4 shadow-xl shadow-stone-950/5 backdrop-blur sm:p-6">
            <lib-go-game-board
              [mode]="settings()!.mode"
              [boardSize]="state()!.boardSize"
              [board]="state()!.board"
              [phase]="state()!.phase"
              [currentPlayer]="state()!.nextPlayer"
              [lastMove]="lastPlacedPoint()"
              [winningLine]="state()!.winnerLine"
              [deadStones]="state()!.scoring?.deadStones ?? []"
              [interactive]="state()!.phase !== 'finished'"
              (pointSelected)="onBoardPoint($event)"
            />
          </div>

            <lib-go-match-sidebar
              [settings]="settings()"
              [state]="state()"
            (passRequested)="passTurn()"
            (resignRequested)="resignMatch()"
            (finalizeScoringRequested)="finalizeScoring()"
            (helpRequested)="helpVisible.set(true)"
            (restartRequested)="restartMatch()"
            (newMatchRequested)="openNewMatchConfirm()"
          />
        </div>
      </section>

      <p-drawer
        [visible]="helpVisible()"
        (visibleChange)="helpVisible.set($event)"
        position="right"
        header="Rules and reminders"
      >
        <div class="space-y-4 text-sm leading-6 text-stone-700">
          <p>{{ meta()!.description }}</p>
          <ul class="space-y-3">
            @for (fact of meta()!.help; track fact) {
              <li class="flex gap-3">
                <span class="mt-2 h-2 w-2 rounded-full bg-amber-500"></span>
                <span>{{ fact }}</span>
              </li>
            }
          </ul>
        </div>
      </p-drawer>

      <p-dialog
        [visible]="resultVisible()"
        (visibleChange)="resultVisible.set($event)"
        [modal]="true"
        [dismissableMask]="true"
        [draggable]="false"
        [resizable]="false"
        header="Match result"
      >
        <div class="space-y-4">
          <p class="text-base font-semibold text-stone-900">
            {{ state()!.result?.summary }}
          </p>

          @if (state()!.result?.score) {
            <div class="grid grid-cols-2 gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm">
              <div>
                <p class="font-semibold text-stone-900">Black</p>
                <p>{{ state()!.result!.score!.black.toFixed(1) }}</p>
              </div>
              <div>
                <p class="font-semibold text-stone-900">White</p>
                <p>{{ state()!.result!.score!.white.toFixed(1) }}</p>
              </div>
            </div>
          }

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
              (click)="restartMatch()"
            >
              Restart match
            </button>
            <button
              type="button"
              class="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              (click)="openNewMatchConfirm()"
            >
              New setup
            </button>
          </div>
        </div>
      </p-dialog>
    }
  `,
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
      header: 'Resign this match?',
      message: 'This will end the current local game immediately.',
      acceptLabel: 'Resign',
      rejectLabel: 'Keep playing',
      accept: () => {
        this.reportAction(this.store.resign(), 'Resignation unavailable');
      },
    });
  }

  protected restartMatch(): void {
    this.confirmation.confirm({
      header: 'Restart the current match?',
      message: 'Players and board settings stay the same, but the board resets.',
      acceptLabel: 'Restart',
      rejectLabel: 'Cancel',
      accept: () => {
        if (this.store.restartMatch()) {
          this.resultVisible.set(false);
          this.messages.add({
            severity: 'success',
            summary: 'Match restarted',
            detail: 'The local board has been reset.',
          });
        }
      },
    });
  }

  protected openNewMatchConfirm(): void {
    const mode = this.mode();

    this.confirmation.confirm({
      header: 'Start a new setup?',
      message: 'The current local board will be cleared and you will return to the setup screen.',
      acceptLabel: 'Go to setup',
      rejectLabel: 'Stay here',
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
