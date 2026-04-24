import { InjectionToken } from '@angular/core';
import { GoAnalyticsConfig } from './go-analytics.types';

export const GO_ANALYTICS_CONFIG = new InjectionToken<GoAnalyticsConfig>(
  'GO_ANALYTICS_CONFIG',
  {
    providedIn: 'root',
    factory: () => ({
      containerId: 'GTM-TQXTJ3LC',
      enabled: true,
    }),
  },
);
