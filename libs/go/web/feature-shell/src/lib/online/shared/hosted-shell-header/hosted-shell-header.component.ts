import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { GameMode } from '@gx/go/domain';
import { GoAnalyticsLocale, GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { GoLocaleSwitcherComponent } from '@gx/go/ui';

@Component({
  selector: 'lib-go-hosted-shell-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, GoLocaleSwitcherComponent],
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
            #goSetupLink="routerLinkActive"
            [routerLink]="['/setup', 'go']"
            routerLinkActive
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
            class="inline-flex items-center rounded-sm px-3.5 py-2 text-sm font-medium transition hover:border-white/20 hover:bg-white/10"
            [class.border]="true"
            [class.border-white/10]="!goSetupLink.isActive"
            [class.bg-white/5]="!goSetupLink.isActive"
            [class.text-stone-100]="!goSetupLink.isActive"
            [class.border-amber-300/35]="goSetupLink.isActive"
            [class.bg-white/15]="goSetupLink.isActive"
            [class.text-stone-50]="goSetupLink.isActive"
            data-testid="hosted-header-link-setup-go"
            (click)="trackLocalModeSelection('go')"
          >
            {{ i18n.t('hosted.header.start_local_go') }}
          </a>
          <a
            #gomokuSetupLink="routerLinkActive"
            [routerLink]="['/setup', 'gomoku']"
            routerLinkActive
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
            class="inline-flex items-center rounded-sm px-3.5 py-2 text-sm font-medium transition hover:border-white/20 hover:bg-white/10"
            [class.border]="true"
            [class.border-white/10]="!gomokuSetupLink.isActive"
            [class.bg-white/5]="!gomokuSetupLink.isActive"
            [class.text-stone-100]="!gomokuSetupLink.isActive"
            [class.border-amber-300/35]="gomokuSetupLink.isActive"
            [class.bg-white/15]="gomokuSetupLink.isActive"
            [class.text-stone-50]="gomokuSetupLink.isActive"
            data-testid="hosted-header-link-setup-gomoku"
            (click)="trackLocalModeSelection('gomoku')"
          >
            {{ i18n.t('hosted.header.start_local_gomoku') }}
          </a>
          <a
            #privacyLink="routerLinkActive"
            routerLink="/privacy"
            routerLinkActive
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
            class="inline-flex items-center rounded-sm px-3.5 py-2 text-sm font-medium transition hover:border-white/20 hover:bg-white/10"
            [class.border]="true"
            [class.border-white/10]="!privacyLink.isActive"
            [class.bg-white/5]="!privacyLink.isActive"
            [class.text-stone-100]="!privacyLink.isActive"
            [class.border-amber-300/35]="privacyLink.isActive"
            [class.bg-white/15]="privacyLink.isActive"
            [class.text-stone-50]="privacyLink.isActive"
            data-testid="hosted-header-link-privacy"
          >
            {{ i18n.t('hosted.header.privacy') }}
          </a>
          <lib-go-locale-switcher
            (localeChangeRequested)="trackLocaleChange($event)"
          />
        </nav>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostedShellHeaderComponent {
  protected readonly i18n = inject(GoI18nService);
  private readonly analytics = inject(GoAnalyticsService);

  protected trackLocalModeSelection(gameMode: GameMode): void {
    this.analytics.track({
      content_id: gameMode,
      content_type: 'local_mode',
      event: 'select_content',
      game_mode: gameMode,
    });
  }

  protected trackLocaleChange(event: {
    locale: GoAnalyticsLocale;
    targetLocale: GoAnalyticsLocale;
  }): void {
    this.analytics.track({
      event: 'gx_locale_change',
      locale: event.locale,
      target_locale: event.targetLocale,
    });
  }
}
