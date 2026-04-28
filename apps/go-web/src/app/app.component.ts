import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { GoAnalyticsConsentService, GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { AppSeoService } from './seo/app-seo.service';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly analyticsConsent = inject(GoAnalyticsConsentService);
  protected readonly i18n = inject(GoI18nService);
  private readonly analytics = inject(GoAnalyticsService);
  private readonly router = inject(Router);
  private readonly seo = inject(AppSeoService);

  constructor() {
    this.seo.watchRouteMetadata();
    this.analytics.watchRouter(this.router);
    this.analytics.trackCurrentPage();
  }

  protected acceptAnalytics(): void {
    this.analytics.grantAnalyticsConsent();
  }

  protected declineAnalytics(): void {
    this.analytics.denyAnalyticsConsent();
  }
}
