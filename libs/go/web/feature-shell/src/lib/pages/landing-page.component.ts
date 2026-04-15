import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_MODE_LIST } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'lib-go-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModule, TagModule],
  template: `
    <section class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 px-6 py-10 text-stone-50 shadow-2xl shadow-slate-950/40 sm:px-10">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_36%)]"></div>
        <div class="relative space-y-4">
          <p class="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/70">
            {{ i18n.t('landing.local_play_tag') }}
          </p>
          <h1 class="max-w-3xl text-4xl font-semibold leading-tight text-balance sm:text-5xl">
            {{ i18n.t('landing.title') }}
          </h1>
          <p class="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
            {{ i18n.t('landing.description') }}
          </p>

          <div class="flex flex-wrap gap-3 pt-2">
            <a
              routerLink="/online"
              class="inline-flex items-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              {{ i18n.t('landing.open_online_lobby') }}
            </a>
          </div>
        </div>
      </header>

      <div class="mt-10 grid gap-6 lg:grid-cols-2">
        @for (mode of modes(); track mode.mode) {
          <p-card styleClass="h-full overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/90 shadow-xl shadow-amber-950/10">
            <ng-template pTemplate="header">
              <div class="space-y-4 border-b border-stone-200/80 bg-[linear-gradient(140deg,_rgba(250,245,235,0.96),_rgba(255,255,255,0.92))] px-6 py-6">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                      {{ i18n.t('landing.mode_label', { mode: i18n.t('common.mode.' + mode.mode) }) }}
                    </p>
                    <h2 class="mt-2 text-3xl font-semibold text-stone-950">
                      {{ mode.title }}
                    </h2>
                  </div>

                  <p-tag
                    severity="contrast"
                    [value]="
                      i18n.t('landing.board_size_badge', {
                        sizes: mode.boardSizes.join(' / '),
                      })
                    "
                  />
                </div>

                <p class="text-sm leading-6 text-stone-600">
                  {{ mode.strapline }}
                </p>
              </div>
            </ng-template>

            <div class="space-y-5 px-1 pb-2 pt-1">
              <p class="text-sm leading-6 text-stone-600">
                {{ mode.description }}
              </p>

              <section>
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                  {{ i18n.t('landing.objective') }}
                </p>
                <p class="mt-2 text-sm leading-6 text-stone-700">
                  {{ mode.objective }}
                </p>
              </section>

              <section>
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                  {{ i18n.t('landing.highlights') }}
                </p>
                <ul class="mt-3 space-y-2 text-sm text-stone-700">
                  @for (fact of mode.help; track fact) {
                    <li class="flex gap-3">
                      <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                      <span>{{ fact }}</span>
                    </li>
                  }
                </ul>
              </section>

              <a
                [routerLink]="['/setup', mode.mode]"
                class="inline-flex items-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
              >
                {{
                  i18n.t('landing.start_local_mode', {
                    mode: mode.title,
                  })
                }}
              </a>
            </div>
          </p-card>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly modes = computed(() =>
    GAME_MODE_LIST.map(mode => this.i18n.gameModeMeta(mode.mode))
  );
}
