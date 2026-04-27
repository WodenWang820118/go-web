import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { GO_ANALYTICS_CONFIG } from './go-analytics-config.token';
import { GoAnalyticsConsentService } from './go-analytics-consent.service';
import {
  GoAnalyticsEvent,
  GoAnalyticsPageViewEvent,
  GoDataLayerEntry,
} from './go-analytics.types';

@Injectable({ providedIn: 'root' })
export class GoAnalyticsService {
  private readonly config = inject(GO_ANALYTICS_CONFIG);
  private readonly consent = inject(GoAnalyticsConsentService);
  private readonly document = inject(DOCUMENT);
  private readonly fallbackDataLayer: GoDataLayerEntry[] = [];
  private readonly trackedOnceKeys = new Set<string>();
  private currentRouter: Router | null = null;
  private lastTrackedPagePath: string | null = null;
  private routerSubscription: Subscription | null = null;

  watchRouter(router: Router): void {
    this.currentRouter = router;

    if (this.routerSubscription) {
      return;
    }

    this.routerSubscription = router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  track(event: GoAnalyticsEvent): void {
    if (!this.consent.canTrack()) {
      return;
    }

    this.ensureTagManagerLoaded();
    this.dataLayer().push(event);
  }

  trackOnce(key: string, event: GoAnalyticsEvent): void {
    if (!this.consent.canTrack() || this.trackedOnceKeys.has(key)) {
      return;
    }

    this.track(event);
    this.trackedOnceKeys.add(key);
  }

  trackPageView(url: string): void {
    const event = buildGoAnalyticsPageViewEvent(url);

    if (event.page_path_normalized === this.lastTrackedPagePath) {
      return;
    }

    this.track(event);

    if (this.consent.canTrack()) {
      this.lastTrackedPagePath = event.page_path_normalized;
    }
  }

  trackCurrentPage(): void {
    const url = this.currentRouter?.url ?? this.document.location?.pathname;

    if (url) {
      this.trackPageView(url);
    }
  }

  private ensureTagManagerLoaded(): void {
    if (!this.config.enabled || this.config.containerId.trim().length === 0) {
      return;
    }

    const containerId = encodeURIComponent(this.config.containerId.trim());
    const scriptId = `gx-gtm-script-${containerId}`;

    if (this.document.getElementById(scriptId)) {
      return;
    }

    const firstScript = this.document.getElementsByTagName('script')[0];
    const script = this.document.createElement('script');

    this.dataLayer().push([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      },
    ]);
    this.dataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
      },
    ]);
    this.dataLayer().push({
      'gtm.start': Date.now(),
      event: 'gtm.js',
    });

    script.async = true;
    script.id = scriptId;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
      return;
    }

    this.document.head.appendChild(script);
  }

  private dataLayer(): GoDataLayerEntry[] {
    const view = this.document.defaultView;

    if (!view) {
      return this.fallbackDataLayer;
    }

    if (!view.dataLayer) {
      view.dataLayer = [];
    }

    return view.dataLayer;
  }
}

export function buildGoAnalyticsPageViewEvent(
  url: string,
): GoAnalyticsPageViewEvent {
  const path = normalizePath(url);
  const segments = path.split('/').filter(Boolean);
  const [first, second, third] = segments;

  if (segments.length === 0) {
    return {
      event: 'gx_page_view',
      page_path_normalized: '/',
      route_group: 'lobby',
      play_context: 'hosted',
    };
  }

  if (first === 'setup' && isTrackedGameMode(second)) {
    return {
      event: 'gx_page_view',
      game_mode: second,
      page_path_normalized: `/setup/${second}`,
      route_group: 'setup',
    };
  }

  if (first === 'play' && isTrackedGameMode(second)) {
    return {
      event: 'gx_page_view',
      game_mode: second,
      page_path_normalized: `/play/${second}`,
      play_context: 'local',
      route_group: 'local_play',
    };
  }

  if (first === 'online' && second === 'room' && third) {
    return {
      event: 'gx_page_view',
      page_path_normalized: '/online/room/:roomId',
      play_context: 'hosted',
      route_group: 'online_room',
    };
  }

  return {
    event: 'gx_page_view',
    page_path_normalized: path,
    route_group: 'unknown',
  };
}

function normalizePath(url: string): string {
  const [pathWithoutHash] = url.split('#');
  const [pathWithoutQuery] = pathWithoutHash.split('?');
  const path = pathWithoutQuery.trim();

  if (!path || path === '/') {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

function isTrackedGameMode(
  value: string | undefined,
): value is 'go' | 'gomoku' {
  return value === 'go' || value === 'gomoku';
}
