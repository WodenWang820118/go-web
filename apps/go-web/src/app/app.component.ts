import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { GoAnalyticsConsentService, GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { DialogModule } from 'primeng/dialog';
import { AppSeoService } from './seo/app-seo.service';

type AnalyticsConsentDialogOrigin = 'banner' | 'launcher';

@Component({
  imports: [DialogModule, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly analyticsConsent = inject(GoAnalyticsConsentService);
  protected readonly i18n = inject(GoI18nService);
  protected readonly consentDialogVisible = signal(false);
  protected readonly analyticsDraftEnabled = signal(false);
  private readonly consentDialogOrigin =
    signal<AnalyticsConsentDialogOrigin | null>(null);
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

  protected openAnalyticsPreferences(
    origin: AnalyticsConsentDialogOrigin,
  ): void {
    this.analyticsDraftEnabled.set(
      this.analytics.consentChoice() === 'granted',
    );
    this.consentDialogOrigin.set(origin);
    this.consentDialogVisible.set(true);
  }

  protected cancelAnalyticsPreferences(): void {
    this.consentDialogVisible.set(false);
    this.consentDialogOrigin.set(null);
  }

  protected confirmAnalyticsPreferences(): void {
    const origin = this.consentDialogOrigin();

    if (this.analyticsDraftEnabled()) {
      this.analytics.grantAnalyticsConsent();
    } else {
      this.analytics.denyAnalyticsConsent();
    }

    this.consentDialogVisible.set(false);
    this.consentDialogOrigin.set(null);

    if (origin === 'banner') {
      void this.router.navigate(['/']);
    }
  }

  protected onConsentDialogVisibleChange(visible: boolean): void {
    if (visible) {
      this.consentDialogVisible.set(true);
      return;
    }

    this.cancelAnalyticsPreferences();
  }

  protected setAnalyticsDraftFromEvent(event: Event): void {
    this.analyticsDraftEnabled.set(
      event.target instanceof HTMLInputElement && event.target.checked,
    );
  }
}
