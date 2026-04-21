import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoI18nService } from '@gx/go/state/i18n';
import { GoLocaleSwitcherComponent } from '@gx/go/ui';

@Component({
  selector: 'lib-go-hosted-shell-header',
  standalone: true,
  imports: [RouterLink, GoLocaleSwitcherComponent],
  template: `
    <header
      class="overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,_rgba(13,19,26,0.98),_rgba(27,33,40,0.94))] px-4 py-3 text-stone-50 shadow-xl shadow-slate-950/20 sm:px-5"
    >
      <div
        class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-wrap items-center gap-2">
          <a
            routerLink="/"
            class="inline-flex items-center rounded-sm border border-white/10 bg-white/10 px-3.5 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-stone-50 transition hover:border-white/20 hover:bg-white/20"
          >
            gx.go
          </a>
        </div>

        <nav
          class="flex flex-wrap items-center gap-2"
          aria-label="Hosted actions"
        >
          <a
            [routerLink]="['/setup', 'go']"
            class="inline-flex items-center rounded-sm border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/10"
          >
            {{ i18n.t('hosted.header.start_local_go') }}
          </a>
          <a
            [routerLink]="['/setup', 'gomoku']"
            class="inline-flex items-center rounded-sm border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/10"
          >
            {{ i18n.t('hosted.header.start_local_gomoku') }}
          </a>
          <lib-go-locale-switcher />
        </nav>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostedShellHeaderComponent {
  protected readonly i18n = inject(GoI18nService);
}
