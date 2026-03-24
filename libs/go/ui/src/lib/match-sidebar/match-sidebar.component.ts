import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MatchSettings, MatchState, MoveRecord } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { GameStatusChipComponent } from '../game-status-chip/game-status-chip.component';
import { StoneBadgeComponent } from '../stone-badge/stone-badge.component';

@Component({
  selector: 'lib-go-match-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DividerModule,
    TagModule,
    GameStatusChipComponent,
    StoneBadgeComponent,
  ],
  template: `
    @if (settings() && state()) {
      <aside class="flex h-full flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5 text-stone-100 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/60">
              {{
                settings()!.mode === 'go'
                  ? i18n.t('ui.match_sidebar.go_match')
                  : i18n.t('ui.match_sidebar.gomoku_match')
              }}
            </p>
            <h2 class="text-xl font-semibold text-stone-50">
              {{ settings()!.players.black }} vs {{ settings()!.players.white }}
            </h2>
          </div>

          <lib-go-game-status-chip
            [phase]="state()!.phase"
            [currentPlayer]="state()!.nextPlayer"
            [result]="state()!.result"
          />
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          @for (player of players(); track player.color) {
            <section
              class="rounded-2xl border px-4 py-3"
              [class.border-amber-300/50]="state()!.nextPlayer === player.color && state()!.phase === 'playing'"
              [class.bg-amber-300/10]="state()!.nextPlayer === player.color && state()!.phase === 'playing'"
              [class.border-white/10]="state()!.nextPlayer !== player.color || state()!.phase !== 'playing'"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <lib-go-stone-badge [color]="player.color" />
                  <div>
                    <p class="text-sm font-semibold text-stone-50">{{ player.name }}</p>
                    <p class="text-xs uppercase tracking-[0.24em] text-stone-400">
                      {{ i18n.playerLabel(player.color) }}
                    </p>
                  </div>
                </div>

                @if (settings()!.mode === 'go') {
                  <p-tag
                    severity="contrast"
                    [value]="
                      i18n.t('ui.match_sidebar.captures', {
                        count: state()!.captures[player.color],
                      })
                    "
                  />
                }
              </div>
            </section>
          }
        </div>

        @if (settings()!.mode === 'go' && state()!.scoring?.score) {
          <section class="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/75">
              {{ i18n.t('ui.match_sidebar.score_preview') }}
            </p>
            <div class="mt-3 grid grid-cols-2 gap-3 text-sm text-stone-100">
              <div>
                <p class="font-semibold">{{ i18n.playerLabel('black') }}</p>
                <p>{{ state()!.scoring!.score.black.toFixed(1) }}</p>
              </div>
              <div>
                <p class="font-semibold">{{ i18n.playerLabel('white') }}</p>
                <p>{{ state()!.scoring!.score.white.toFixed(1) }}</p>
              </div>
            </div>
          </section>
        }

        <section class="flex flex-wrap gap-2">
          <button
            pButton
            type="button"
            class="p-button-sm"
            [disabled]="!canPass()"
            (click)="passRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.pass') }}
          </button>
          <button
            pButton
            type="button"
            severity="warn"
            class="p-button-sm"
            [disabled]="!canResign()"
            (click)="resignRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.resign') }}
          </button>
          <button
            pButton
            type="button"
            severity="success"
            class="p-button-sm"
            [disabled]="!canFinalizeScoring()"
            (click)="finalizeScoringRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.finalize_score') }}
          </button>
          <button
            pButton
            type="button"
            severity="secondary"
            class="p-button-sm"
            (click)="helpRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.rules') }}
          </button>
          <button
            pButton
            type="button"
            severity="secondary"
            class="p-button-sm"
            (click)="restartRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.restart') }}
          </button>
          <button
            pButton
            type="button"
            severity="secondary"
            class="p-button-sm"
            (click)="newMatchRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.new_match') }}
          </button>
        </section>

        <p-divider />

        <section class="flex min-h-0 flex-1 flex-col">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-stone-400">
              {{ i18n.t('ui.match_sidebar.move_log') }}
            </h3>
            <p class="text-xs text-stone-500">
              {{
                i18n.t('ui.match_sidebar.moves_count', {
                  count: state()!.moveHistory.length,
                })
              }}
            </p>
          </div>

          <div class="min-h-0 flex-1 overflow-auto pr-2">
            @if (recentMoves().length > 0) {
              <ol class="space-y-2">
                @for (move of recentMoves(); track move.id) {
                  <li class="rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-stone-200">
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-semibold">
                        {{ move.moveNumber }}. {{ i18n.moveNotation(move) }}
                      </span>
                      <span class="text-xs uppercase tracking-[0.24em] text-stone-500">
                        {{ i18n.playerLabel(move.player) }}
                      </span>
                    </div>
                  </li>
                }
              </ol>
            } @else {
              <p class="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-stone-400">
                {{ i18n.t('ui.match_sidebar.empty_move_log') }}
              </p>
            }
          </div>
        </section>
      </aside>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchSidebarComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly settings = input<MatchSettings | null>(null);
  readonly state = input<MatchState | null>(null);

  readonly passRequested = output<void>();
  readonly resignRequested = output<void>();
  readonly finalizeScoringRequested = output<void>();
  readonly helpRequested = output<void>();
  readonly restartRequested = output<void>();
  readonly newMatchRequested = output<void>();

  readonly players = computed(() => {
    const settings = this.settings();

    if (!settings) {
      return [];
    }

    return [
      {
        color: 'black' as const,
        name: settings.players.black,
      },
      {
        color: 'white' as const,
        name: settings.players.white,
      },
    ];
  });

  readonly recentMoves = computed<MoveRecord[]>(() =>
    [...(this.state()?.moveHistory ?? [])].reverse()
  );

  readonly canPass = computed(
    () => this.settings()?.mode === 'go' && this.state()?.phase === 'playing'
  );

  readonly canResign = computed(() => this.state()?.phase === 'playing');

  readonly canFinalizeScoring = computed(
    () => this.settings()?.mode === 'go' && this.state()?.phase === 'scoring'
  );

}
