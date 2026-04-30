import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {
  MatchSettings,
  MatchState,
  MoveRecord,
  type GoScoringRule,
  type PlayerColor,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameStatusChipComponent } from '../game-status-chip/game-status-chip.component';
import { StoneBadgeComponent } from '../stone-badge/stone-badge.component';

@Component({
  selector: 'lib-go-match-sidebar',
  standalone: true,
  imports: [CommonModule, GameStatusChipComponent, StoneBadgeComponent],
  template: `
    @if (settings() && state()) {
      <aside class="flex h-full min-h-0 flex-col gap-4 overflow-auto rounded-lg border border-white/10 bg-slate-950/70 p-5 text-stone-100 shadow-2xl shadow-slate-950/40 backdrop-blur">
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
                  <span
                    class="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-stone-100"
                  >
                    {{
                      i18n.t('ui.match_sidebar.captures', {
                        count: state()!.captures[player.color],
                      })
                    }}
                  </span>
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
            <p class="mt-1 text-xs font-semibold text-amber-50/85">
              {{ scoringRuleLabel(state()!.scoring!.score.scoringRule) }}
            </p>
            <div class="mt-3 grid grid-cols-2 gap-3 text-sm text-stone-100">
              <div>
                <p class="font-semibold">
                  {{ i18n.playerLabel('black') }}
                  @if (isScoringConfirmed('black')) {
                    <span class="ml-1 text-xs text-emerald-200">
                      {{ i18n.t('ui.match_sidebar.confirmed') }}
                    </span>
                  }
                </p>
                <p>{{ state()!.scoring!.score.black.toFixed(1) }}</p>
              </div>
              <div>
                <p class="font-semibold">
                  {{ i18n.playerLabel('white') }}
                  @if (isScoringConfirmed('white')) {
                    <span class="ml-1 text-xs text-emerald-200">
                      {{ i18n.t('ui.match_sidebar.confirmed') }}
                    </span>
                  }
                </p>
                <p>{{ state()!.scoring!.score.white.toFixed(1) }}</p>
              </div>
            </div>
            @if (state()!.scoring!.score.scoringRule === 'japanese-territory') {
              <p
                class="mt-3 rounded-sm border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-stone-100"
                data-testid="match-sidebar-score-prisoners"
              >
                {{
                  i18n.t('ui.match_sidebar.prisoner_points', {
                    black: state()!.scoring!.score.blackPrisoners,
                    white: state()!.scoring!.score.whitePrisoners,
                  })
                }}
              </p>
            }
          </section>
        }

        <section class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canPass()"
            (click)="passRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.pass') }}
          </button>
          <button
            type="button"
            class="rounded-full bg-rose-500/18 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/28 disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canResign()"
            (click)="resignRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.resign') }}
          </button>
          @if (canShowScoringAgreement()) {
            @for (player of players(); track player.color) {
              <button
                type="button"
                class="rounded-full bg-emerald-500/18 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/28 disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="!canConfirmScoring(player.color)"
                (click)="confirmScoringRequested.emit(player.color)"
              >
                {{
                  i18n.t('ui.match_sidebar.confirm_score', {
                    player: i18n.playerLabel(player.color),
                  })
                }}
              </button>
            }

            @for (player of players(); track player.color) {
              <button
                type="button"
                class="rounded-full bg-amber-500/18 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/28 disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="!canDisputeScoring(player.color)"
                (click)="disputeScoringRequested.emit(player.color)"
              >
                {{
                  i18n.t('ui.match_sidebar.dispute_score', {
                    player: i18n.playerLabel(player.color),
                  })
                }}
              </button>
            }
          }
          <button
            type="button"
            class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/20 hover:bg-white/10"
            (click)="helpRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.rules') }}
          </button>
          <button
            type="button"
            class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/20 hover:bg-white/10"
            (click)="restartRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.restart') }}
          </button>
          <button
            type="button"
            class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-white/20 hover:bg-white/10"
            (click)="newMatchRequested.emit()"
          >
            {{ i18n.t('ui.match_sidebar.new_match') }}
          </button>
        </section>

        <div class="h-px w-full bg-white/10"></div>

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
  readonly confirmScoringRequested = output<PlayerColor>();
  readonly disputeScoringRequested = output<PlayerColor>();
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
    [...(this.state()?.moveHistory ?? [])].reverse(),
  );

  readonly canPass = computed(
    () => this.settings()?.mode === 'go' && this.state()?.phase === 'playing',
  );

  readonly canResign = computed(() => this.state()?.phase === 'playing');

  readonly canFinalizeScoring = computed(
    () => this.settings()?.mode === 'go' && this.state()?.phase === 'scoring',
  );

  readonly canShowScoringAgreement = this.canFinalizeScoring;

  protected isScoringConfirmed(color: PlayerColor): boolean {
    return this.state()?.scoring?.confirmedBy?.includes(color) ?? false;
  }

  protected canConfirmScoring(color: PlayerColor): boolean {
    return this.canFinalizeScoring() && !this.isScoringConfirmed(color);
  }

  protected canDisputeScoring(color: PlayerColor): boolean {
    void color;
    return this.canFinalizeScoring();
  }

  protected scoringRuleLabel(rule: GoScoringRule): string {
    return this.i18n.t(`go_rules.scoring_rule.${rule.replace('-', '_')}`);
  }
}
