import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  GO_ROUTE_SEO_DATA_KEY,
  GO_SITE_ORIGIN,
  GO_SOCIAL_IMAGE_URL,
  GoRouteSeoData,
} from '@gx/go/state';
import { filter } from 'rxjs';

interface ResolvedSeoMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly robots: 'index,follow' | 'noindex,follow';
}

const DEFAULT_SEO: ResolvedSeoMetadata = {
  title: 'gx.go｜線上圍棋與五子棋房間',
  description:
    'gx.go 提供繁中線上圍棋與五子棋房間，可建立對局、分享連結、邀請玩家與觀戰者即時加入。',
  canonicalPath: '/',
  robots: 'index,follow',
};

const SETUP_SEO = {
  go: {
    title: '線上圍棋開局設定｜gx.go',
    description:
      '在 gx.go 設定 9x9、13x13 或 19x19 圍棋對局，快速開始本機練習或前往線上房間邀請朋友。',
  },
  gomoku: {
    title: '線上五子棋開局設定｜gx.go',
    description:
      '在 gx.go 建立 15x15 五子棋對局，立即練習連五攻防，或開線上房間與朋友同場遊玩。',
  },
} as const;

const PRIVACY_SEO: ResolvedSeoMetadata = {
  title: 'Privacy and Cookie Preferences | gx.go',
  description:
    'Manage gx.go analytics consent and review browser storage used for rooms, preferences, and Google Analytics.',
  canonicalPath: '/privacy',
  robots: 'index,follow',
};

const MODE_LABEL = {
  go: '圍棋',
  gomoku: '五子棋',
} as const;

@Injectable({ providedIn: 'root' })
export class AppSeoService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private isWatching = false;

  watchRouteMetadata(): void {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;
    this.applyCurrentRouteMetadata();
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.applyCurrentRouteMetadata());
  }

  private applyCurrentRouteMetadata(): void {
    const activeRoute = this.findActiveRoute();
    const routeSeo = activeRoute.snapshot.data[GO_ROUTE_SEO_DATA_KEY] as
      | GoRouteSeoData
      | undefined;
    const metadata = this.resolveMetadata(routeSeo, activeRoute);
    const canonicalUrl = this.absoluteUrl(metadata.canonicalPath);

    this.title.setTitle(metadata.title);
    this.setMetaName('description', metadata.description);
    this.setMetaName('robots', metadata.robots);
    this.setMetaProperty('og:locale', 'zh_TW');
    this.setMetaProperty('og:type', 'website');
    this.setMetaProperty('og:site_name', 'gx.go');
    this.setMetaProperty('og:title', metadata.title);
    this.setMetaProperty('og:description', metadata.description);
    this.setMetaProperty('og:url', canonicalUrl);
    this.setMetaProperty('og:image', GO_SOCIAL_IMAGE_URL);
    this.setMetaName('twitter:card', 'summary_large_image');
    this.setMetaName('twitter:title', metadata.title);
    this.setMetaName('twitter:description', metadata.description);
    this.setMetaName('twitter:image', GO_SOCIAL_IMAGE_URL);
    this.upsertCanonicalLink(canonicalUrl);
  }

  private findActiveRoute(): ActivatedRoute {
    let currentRoute = this.route;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    return currentRoute;
  }

  private resolveMetadata(
    routeSeo: GoRouteSeoData | undefined,
    route: ActivatedRoute,
  ): ResolvedSeoMetadata {
    if (!routeSeo) {
      return {
        ...DEFAULT_SEO,
        canonicalPath: this.currentPath(),
      };
    }

    if (routeSeo.page === 'setup') {
      const mode = this.routeMode(route);
      return {
        ...SETUP_SEO[mode],
        canonicalPath: `/setup/${mode}`,
        robots: 'index,follow',
      };
    }

    if (routeSeo.page === 'privacy') {
      return PRIVACY_SEO;
    }

    if (routeSeo.page === 'room') {
      const roomId = route.snapshot.paramMap.get('roomId') ?? '';
      return {
        title: roomId ? `線上對局房間 ${roomId}｜gx.go` : '線上對局房間｜gx.go',
        description:
          'gx.go 線上房間支援圍棋與五子棋對局、觀戰、聊天與可分享的即時房間連結。',
        canonicalPath: this.currentPath(),
        robots: 'noindex,follow',
      };
    }

    if (routeSeo.page === 'play') {
      const mode = this.routeMode(route);
      return {
        title: `本機${MODE_LABEL[mode]}對局｜gx.go`,
        description:
          'gx.go 本機對局頁可快速進行圍棋或五子棋練習；此頁依目前瀏覽器 session 顯示對局狀態。',
        canonicalPath: this.currentPath(),
        robots: 'noindex,follow',
      };
    }

    return DEFAULT_SEO;
  }

  private routeMode(route: ActivatedRoute): keyof typeof MODE_LABEL {
    return route.snapshot.paramMap.get('mode') === 'gomoku' ? 'gomoku' : 'go';
  }

  private currentPath(): string {
    return this.router.url.split(/[?#]/u)[0] || '/';
  }

  private absoluteUrl(path: string): string {
    return new URL(path, `${GO_SITE_ORIGIN}/`).toString();
  }

  private setMetaName(name: string, content: string): void {
    this.meta.updateTag({ name, content }, `name="${name}"`);
  }

  private setMetaProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property="${property}"`);
  }

  private upsertCanonicalLink(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', href);
  }
}
