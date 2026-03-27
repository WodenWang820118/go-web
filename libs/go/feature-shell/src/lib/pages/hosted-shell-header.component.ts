import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoI18nService } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-hosted-shell-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header
      class="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(41,37,36,0.92))] px-5 py-5 text-stone-50 shadow-2xl shadow-slate-950/25 sm:px-6"
    >
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-3">
            <a
              routerLink="/"
              class="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold tracking-[0.24em] text-stone-50 uppercase transition hover:border-white/20 hover:bg-white/20"
            >
              gx.go
            </a>

            @if (pageLabel()) {
              <span
                class="rounded-full border border-amber-200/20 bg-amber-300/12 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-amber-100"
              >
                {{ pageLabel() }}
              </span>
            }
          </div>

          <p class="max-w-2xl text-sm leading-6 text-stone-300">
            {{ i18n.t('hosted.header.description') }}
          </p>
        </div>

        <nav class="flex flex-wrap items-center gap-2">
          <a
            routerLink="/"
            class="inline-flex items-center rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            {{ i18n.t('hosted.header.lobby') }}
          </a>
          <a
            [routerLink]="['/setup', 'go']"
            class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/10"
          >
            {{ i18n.t('hosted.header.start_local_go') }}
          </a>
          <a
            [routerLink]="['/setup', 'gomoku']"
            class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/10"
          >
            {{ i18n.t('hosted.header.start_local_gomoku') }}
          </a>
        </nav>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostedShellHeaderComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly activeSection = input<'lobby' | 'room'>('lobby');
  readonly pageLabel = input<string | null>(null);
}
