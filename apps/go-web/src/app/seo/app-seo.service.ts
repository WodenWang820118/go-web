import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  GO_DEFAULT_LOCALE,
  GO_LOCALE_OPTIONS,
  GO_ROUTE_SEO_DATA_KEY,
  GO_SITE_ORIGIN,
  GO_SOCIAL_IMAGE_URL,
  GoI18nService,
  GoLocale,
  GoRouteSeoData,
} from '@gx/go/state';
import { filter, merge } from 'rxjs';

interface ResolvedSeoMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly robots: 'index,follow' | 'noindex,follow';
}

interface SeoCopy {
  readonly title: string;
  readonly description: string;
}

interface LocaleSeoCopy {
  readonly lobby: SeoCopy;
  readonly setup: Record<'go' | 'gomoku', SeoCopy>;
  readonly privacy: SeoCopy;
  readonly room: {
    readonly title: string;
    readonly titleWithId: string;
    readonly description: string;
  };
  readonly play: Record<'go' | 'gomoku', SeoCopy>;
}

const SEO_COPY: Record<GoLocale, LocaleSeoCopy> = {
  en: {
    lobby: {
      title: 'gx.go | Online Go and Gomoku Rooms',
      description:
        'gx.go offers online Go and Gomoku rooms with shareable links, live spectators, and room chat.',
    },
    setup: {
      go: {
        title: 'Online Go Match Setup | gx.go',
        description:
          'Set up a 9x9, 13x13, or 19x19 Go match on gx.go with captures, pass, resignation, and Chinese area scoring.',
      },
      gomoku: {
        title: 'Online Gomoku Match Setup | gx.go',
        description:
          'Set up a fixed 15x15 Gomoku match on gx.go with exact-five wins and fast local play.',
      },
    },
    privacy: {
      title: 'Privacy and Cookie Preferences | gx.go',
      description:
        'Manage gx.go analytics consent and review browser storage used for rooms, preferences, and Google Analytics.',
    },
    room: {
      title: 'Online Match Room | gx.go',
      titleWithId: 'Online Match Room {{roomId}} | gx.go',
      description:
        'Use gx.go online rooms for live Go and Gomoku spectators, chat, and shareable real-time room links.',
    },
    play: {
      go: {
        title: 'Local Go Match | gx.go',
        description:
          'Play a local Go match in gx.go with browser-session state, captures, scoring review, pass, and resignation.',
      },
      gomoku: {
        title: 'Local Gomoku Match | gx.go',
        description:
          'Play a local Gomoku match in gx.go with browser-session state and exact-five win detection.',
      },
    },
  },
  'ja-JP': {
    lobby: {
      title: 'gx.go｜オンライン囲碁・五目並べの部屋',
      description:
        'gx.go は、共有リンク、観戦、部屋チャットに対応したオンライン囲碁・五目並べの部屋を提供します。',
    },
    setup: {
      go: {
        title: 'オンライン囲碁の対局設定｜gx.go',
        description:
          'gx.go で 9x9、13x13、19x19 の囲碁対局を設定できます。取り、パス、投了、中国ルールの地合い計算に対応しています。',
      },
      gomoku: {
        title: 'オンライン五目並べの対局設定｜gx.go',
        description:
          'gx.go で固定 15x15 盤の五目並べを設定できます。ちょうど五連の勝利判定で素早く遊べます。',
      },
    },
    privacy: {
      title: 'プライバシーと Cookie 設定｜gx.go',
      description:
        'gx.go の分析同意、部屋、設定、Google Analytics に使われるブラウザー保存内容を管理できます。',
    },
    room: {
      title: 'オンライン対局部屋｜gx.go',
      titleWithId: 'オンライン対局部屋 {{roomId}}｜gx.go',
      description:
        'gx.go のオンライン部屋では、囲碁と五目並べを観戦、チャット、共有可能なリアルタイムリンクで楽しめます。',
    },
    play: {
      go: {
        title: 'ローカル囲碁対局｜gx.go',
        description:
          'gx.go でブラウザー session の状態を使い、取り、計算確認、パス、投了に対応したローカル囲碁を遊べます。',
      },
      gomoku: {
        title: 'ローカル五目並べ対局｜gx.go',
        description:
          'gx.go でブラウザー session の状態を使い、ちょうど五連の勝利判定に対応したローカル五目並べを遊べます。',
      },
    },
  },
  'zh-CN': {
    lobby: {
      title: 'gx.go｜在线围棋与五子棋房间',
      description:
        'gx.go 提供简中在线围棋与五子棋房间，可建立对局、分享链接、邀请玩家与观战者实时加入。',
    },
    setup: {
      go: {
        title: '在线围棋开局设置｜gx.go',
        description:
          '在 gx.go 设置 9x9、13x13 或 19x19 围棋对局，支持提子、虚手、认输与中国数子法算地。',
      },
      gomoku: {
        title: '在线五子棋开局设置｜gx.go',
        description:
          '在 gx.go 设置固定 15x15 五子棋对局，支持精确五连胜负判定与快速本机对局。',
      },
    },
    privacy: {
      title: '隐私与 Cookie 偏好｜gx.go',
      description:
        '管理 gx.go 分析同意，并查看房间、偏好设置与 Google Analytics 使用的浏览器储存。',
    },
    room: {
      title: '在线对局房间｜gx.go',
      titleWithId: '在线对局房间 {{roomId}}｜gx.go',
      description:
        '使用 gx.go 在线房间观战围棋与五子棋、聊天，并分享实时房间链接。',
    },
    play: {
      go: {
        title: '本机围棋对局｜gx.go',
        description:
          '在 gx.go 使用当前浏览器 session 进行本机围棋对局，支持提子、算地确认、虚手与认输。',
      },
      gomoku: {
        title: '本机五子棋对局｜gx.go',
        description:
          '在 gx.go 使用当前浏览器 session 进行本机五子棋对局，支持精确五连胜负判定。',
      },
    },
  },
  'zh-TW': {
    lobby: {
      title: 'gx.go｜線上圍棋與五子棋房間',
      description:
        'gx.go 提供繁中線上圍棋與五子棋房間，可建立對局、分享連結、邀請玩家與觀戰者即時加入。',
    },
    setup: {
      go: {
        title: '線上圍棋開局設定｜gx.go',
        description:
          '在 gx.go 設定 9x9、13x13 或 19x19 圍棋對局，支援提子、虛手、認輸與中國數子法算地。',
      },
      gomoku: {
        title: '線上五子棋開局設定｜gx.go',
        description:
          '在 gx.go 設定固定 15x15 五子棋對局，支援精確五連勝負判定與快速本機對局。',
      },
    },
    privacy: {
      title: '隱私與 Cookie 偏好｜gx.go',
      description:
        '管理 gx.go 分析同意，並檢視房間、偏好設定與 Google Analytics 使用的瀏覽器儲存。',
    },
    room: {
      title: '線上對局房間｜gx.go',
      titleWithId: '線上對局房間 {{roomId}}｜gx.go',
      description:
        '使用 gx.go 線上房間觀戰、聊天與可分享的即時房間連結，支援圍棋與五子棋。',
    },
    play: {
      go: {
        title: '本機圍棋對局｜gx.go',
        description:
          '依目前瀏覽器 session 顯示對局狀態，支援提子、算地確認、虛手與認輸的本機圍棋對局。',
      },
      gomoku: {
        title: '本機五子棋對局｜gx.go',
        description:
          '依目前瀏覽器 session 顯示對局狀態，支援精確五連勝負判定的本機五子棋對局。',
      },
    },
  },
};

@Injectable({ providedIn: 'root' })
export class AppSeoService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(GoI18nService);
  private readonly localeChanges = toObservable(this.i18n.locale);
  private isWatching = false;

  watchRouteMetadata(): void {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;
    this.applyCurrentRouteMetadata();

    merge(
      this.router.events.pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      ),
      this.localeChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyCurrentRouteMetadata());
  }

  private applyCurrentRouteMetadata(): void {
    const activeRoute = this.findActiveRoute();
    const routeSeo = activeRoute.snapshot.data[GO_ROUTE_SEO_DATA_KEY] as
      | GoRouteSeoData
      | undefined;
    const activeLocale = this.i18n.locale();
    const metadata = this.resolveMetadata(routeSeo, activeRoute, activeLocale);
    const canonicalUrl = this.localeUrl(metadata.canonicalPath, activeLocale);

    this.title.setTitle(metadata.title);
    this.setMetaName('description', metadata.description);
    this.setMetaName('robots', metadata.robots);
    this.setMetaProperty(
      'og:locale',
      GO_LOCALE_OPTIONS.find((option) => option.locale === activeLocale)
        ?.ogLocale ?? 'zh_TW',
    );
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
    this.replaceAlternateLinks(metadata.canonicalPath);
    this.replaceOgLocaleAlternateTags(activeLocale);
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
    locale: GoLocale,
  ): ResolvedSeoMetadata {
    const copy = SEO_COPY[locale];

    if (!routeSeo) {
      return {
        ...copy.lobby,
        canonicalPath: this.currentPath(),
        robots: 'index,follow',
      };
    }

    if (routeSeo.page === 'setup') {
      const mode = this.routeMode(route);
      return {
        ...copy.setup[mode],
        canonicalPath: `/setup/${mode}`,
        robots: 'index,follow',
      };
    }

    if (routeSeo.page === 'privacy') {
      return {
        ...copy.privacy,
        canonicalPath: '/privacy',
        robots: 'index,follow',
      };
    }

    if (routeSeo.page === 'room') {
      const roomId = route.snapshot.paramMap.get('roomId') ?? '';
      return {
        title: roomId
          ? this.interpolate(copy.room.titleWithId, { roomId })
          : copy.room.title,
        description: copy.room.description,
        canonicalPath: this.currentPath(),
        robots: 'noindex,follow',
      };
    }

    if (routeSeo.page === 'play') {
      const mode = this.routeMode(route);
      return {
        ...copy.play[mode],
        canonicalPath: this.currentPath(),
        robots: 'noindex,follow',
      };
    }

    return {
      ...copy.lobby,
      canonicalPath: this.currentPath(),
      robots: 'index,follow',
    };
  }

  private routeMode(route: ActivatedRoute): 'go' | 'gomoku' {
    return route.snapshot.paramMap.get('mode') === 'gomoku' ? 'gomoku' : 'go';
  }

  private currentPath(): string {
    return this.router.url.split(/[?#]/u)[0] || '/';
  }

  private localeUrl(path: string, locale: GoLocale): string {
    const url = new URL(path, `${GO_SITE_ORIGIN}/`);

    if (locale === GO_DEFAULT_LOCALE) {
      url.searchParams.delete('locale');
    } else {
      url.searchParams.set('locale', locale);
    }

    return url.toString();
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

  private replaceAlternateLinks(path: string): void {
    this.document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((link) => link.remove());

    const alternates = [
      ...GO_LOCALE_OPTIONS.map((option) => ({
        href: this.localeUrl(path, option.locale),
        hreflang: option.hreflang,
      })),
      {
        href: this.localeUrl(path, GO_DEFAULT_LOCALE),
        hreflang: 'x-default',
      },
    ];

    for (const alternate of alternates) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', alternate.hreflang);
      link.setAttribute('href', alternate.href);
      this.document.head.appendChild(link);
    }
  }

  private replaceOgLocaleAlternateTags(activeLocale: GoLocale): void {
    this.document.head
      .querySelectorAll('meta[property="og:locale:alternate"]')
      .forEach((meta) => meta.remove());

    for (const option of GO_LOCALE_OPTIONS) {
      if (option.locale === activeLocale) {
        continue;
      }

      const meta = this.document.createElement('meta');
      meta.setAttribute('property', 'og:locale:alternate');
      meta.setAttribute('content', option.ogLocale);
      this.document.head.appendChild(meta);
    }
  }

  private interpolate(
    template: string,
    params: Record<string, string>,
  ): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      return params[key] ?? '';
    });
  }
}
