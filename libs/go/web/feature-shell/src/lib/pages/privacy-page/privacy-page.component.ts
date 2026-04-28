import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { HostedShellHeaderComponent } from '../../online/shared/hosted-shell-header/hosted-shell-header.component';

interface PrivacyStorageCategory {
  readonly id: string;
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly examplesKey: string;
  readonly controlKey: string;
}

@Component({
  selector: 'lib-go-privacy-page',
  standalone: true,
  imports: [CommonModule, HostedShellHeaderComponent, RouterLink],
  templateUrl: './privacy-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPageComponent {
  protected readonly i18n = inject(GoI18nService);
  private readonly analytics = inject(GoAnalyticsService);

  protected readonly storageCategories: readonly PrivacyStorageCategory[] = [
    {
      id: 'necessary',
      titleKey: 'privacy.category.necessary.title',
      bodyKey: 'privacy.category.necessary.body',
      examplesKey: 'privacy.category.necessary.examples',
      controlKey: 'privacy.category.necessary.control',
    },
    {
      id: 'preferences',
      titleKey: 'privacy.category.preferences.title',
      bodyKey: 'privacy.category.preferences.body',
      examplesKey: 'privacy.category.preferences.examples',
      controlKey: 'privacy.category.preferences.control',
    },
    {
      id: 'analytics',
      titleKey: 'privacy.category.analytics.title',
      bodyKey: 'privacy.category.analytics.body',
      examplesKey: 'privacy.category.analytics.examples',
      controlKey: 'privacy.category.analytics.control',
    },
  ];
  protected readonly analyticsGranted = computed(
    () => this.analytics.consentChoice() === 'granted',
  );
  protected readonly analyticsDenied = computed(
    () => this.analytics.consentChoice() === 'denied',
  );
  protected readonly analyticsStatus = computed(() => {
    const choice = this.analytics.consentChoice();

    if (choice === 'granted') {
      return this.i18n.t('privacy.analytics.status.granted');
    }

    if (choice === 'denied') {
      return this.i18n.t('privacy.analytics.status.denied');
    }

    return this.i18n.t('privacy.analytics.status.unset');
  });

  protected allowAnalytics(): void {
    this.analytics.grantAnalyticsConsent();
  }

  protected denyAnalytics(): void {
    this.analytics.denyAnalyticsConsent();
  }
}
