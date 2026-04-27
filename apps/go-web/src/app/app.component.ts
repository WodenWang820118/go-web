import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { GoAnalyticsConsentService, GoAnalyticsService } from '@gx/go/state';
import { AppSeoService } from './seo/app-seo.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly analyticsConsent = inject(GoAnalyticsConsentService);
  private readonly analytics = inject(GoAnalyticsService);
  private readonly router = inject(Router);
  private readonly seo = inject(AppSeoService);

  constructor() {
    this.seo.watchRouteMetadata();
    this.analytics.watchRouter(this.router);
    this.analytics.trackCurrentPage();
  }

  protected acceptAnalytics(): void {
    this.analyticsConsent.accept();
    this.analytics.trackCurrentPage();
  }

  protected declineAnalytics(): void {
    this.analyticsConsent.decline();
  }
}
