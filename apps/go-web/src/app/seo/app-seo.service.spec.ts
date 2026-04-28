import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GoI18nService, goRouteSeoData } from '@gx/go/state';
import { AppSeoService } from './app-seo.service';

@Component({
  standalone: true,
  template: '<p>SEO test page</p>',
})
class SeoTestPageComponent {}

describe('AppSeoService', () => {
  let router: Router;

  beforeEach(async () => {
    localStorage.setItem('gx.go.locale', 'zh-TW');
    document.title = '';
    document.head
      .querySelectorAll('meta[name], meta[property], link[rel]')
      .forEach((element) => element.remove());

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: SeoTestPageComponent,
            data: goRouteSeoData('lobby'),
          },
          {
            path: 'setup/:mode',
            component: SeoTestPageComponent,
            data: goRouteSeoData('setup'),
          },
          {
            path: 'online/room/:roomId',
            component: SeoTestPageComponent,
            data: goRouteSeoData('room'),
          },
          {
            path: 'online/room',
            component: SeoTestPageComponent,
            data: goRouteSeoData('room'),
          },
          {
            path: 'play/:mode',
            component: SeoTestPageComponent,
            data: goRouteSeoData('play'),
          },
          {
            path: 'privacy',
            component: SeoTestPageComponent,
            data: goRouteSeoData('privacy'),
          },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    TestBed.inject(AppSeoService).watchRouteMetadata();
  });

  it('publishes indexable lobby metadata', async () => {
    await router.navigateByUrl('/');

    expect(document.title).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaName('description')).toContain('繁中線上圍棋與五子棋房間');
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/');
    expect(alternateHref('zh-Hant-TW')).toBe('https://gxgo.synology.me/');
    expect(alternateHref('zh-Hans-CN')).toBe(
      'https://gxgo.synology.me/?locale=zh-CN',
    );
    expect(alternateHref('ja-JP')).toBe(
      'https://gxgo.synology.me/?locale=ja-JP',
    );
    expect(alternateHref('en')).toBe('https://gxgo.synology.me/?locale=en');
    expect(alternateHref('x-default')).toBe('https://gxgo.synology.me/');
    expect(alternateLinkCount()).toBe(5);
    expect(ogLocaleAlternateCount()).toBe(3);
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/');
    expect(metaProperty('og:title')).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaProperty('og:description')).toContain(
      '繁中線上圍棋與五子棋房間',
    );
    expect(metaProperty('og:locale')).toBe('zh_TW');
    expect(metaProperty('og:type')).toBe('website');
    expect(metaProperty('og:site_name')).toBe('gx.go');
    expect(metaProperty('og:image')).toBe(
      'https://gxgo.synology.me/social/gxgo-og.png',
    );
    expect(metaName('twitter:card')).toBe('summary_large_image');
    expect(metaName('twitter:title')).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaName('twitter:description')).toContain(
      '繁中線上圍棋與五子棋房間',
    );
    expect(metaName('twitter:image')).toBe(
      'https://gxgo.synology.me/social/gxgo-og.png',
    );
    expect(canonicalLinkCount()).toBe(1);
    expect(metaPropertyCount('og:url')).toBe(1);
  });

  it('publishes indexable Go setup metadata', async () => {
    await router.navigateByUrl('/setup/go');

    expect(document.title).toBe('線上圍棋開局設定｜gx.go');
    expect(metaName('description')).toContain('9x9、13x13 或 19x19 圍棋對局');
    expect(metaProperty('og:description')).toContain(
      '9x9、13x13 或 19x19 圍棋對局',
    );
    expect(metaProperty('og:locale')).toBe('zh_TW');
    expect(metaProperty('og:type')).toBe('website');
    expect(metaProperty('og:site_name')).toBe('gx.go');
    expect(metaProperty('og:image')).toBe(
      'https://gxgo.synology.me/social/gxgo-og.png',
    );
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/setup/go');
    expect(alternateHref('ja-JP')).toBe(
      'https://gxgo.synology.me/setup/go?locale=ja-JP',
    );
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/setup/go');
    expect(metaProperty('og:title')).toBe('線上圍棋開局設定｜gx.go');
    expect(metaName('twitter:card')).toBe('summary_large_image');
    expect(metaName('twitter:title')).toBe('線上圍棋開局設定｜gx.go');
    expect(metaName('twitter:image')).toBe(
      'https://gxgo.synology.me/social/gxgo-og.png',
    );
  });

  it('publishes indexable Gomoku setup metadata', async () => {
    await router.navigateByUrl('/setup/gomoku');

    expect(document.title).toBe('線上五子棋開局設定｜gx.go');
    expect(metaName('description')).toContain('15x15 五子棋對局');
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/setup/gomoku');
    expect(metaProperty('og:url')).toBe(
      'https://gxgo.synology.me/setup/gomoku',
    );
    expect(metaName('twitter:card')).toBe('summary_large_image');
    expect(metaName('twitter:title')).toBe('線上五子棋開局設定｜gx.go');
  });

  it('documents the route mode fallback for unexpected setup modes', async () => {
    await router.navigateByUrl('/setup/unknown');

    expect(document.title).toBe('線上圍棋開局設定｜gx.go');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/setup/go');
  });

  it('marks hosted room routes as transient', async () => {
    await router.navigateByUrl('/online/room/ROOM42');

    expect(document.title).toBe('線上對局房間 ROOM42｜gx.go');
    expect(metaName('description')).toContain(
      '觀戰、聊天與可分享的即時房間連結',
    );
    expect(metaProperty('og:description')).toContain(
      '觀戰、聊天與可分享的即時房間連結',
    );
    expect(metaName('robots')).toBe('noindex,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/online/room/ROOM42');
    expect(metaProperty('og:url')).toBe(
      'https://gxgo.synology.me/online/room/ROOM42',
    );
  });

  it('uses the hosted room fallback title when no room id is present', async () => {
    await router.navigateByUrl('/online/room');

    expect(document.title).toBe('線上對局房間｜gx.go');
    expect(metaName('description')).toContain(
      '觀戰、聊天與可分享的即時房間連結',
    );
    expect(metaProperty('og:description')).toContain(
      '觀戰、聊天與可分享的即時房間連結',
    );
    expect(metaName('robots')).toBe('noindex,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/online/room');
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/online/room');
  });

  it('marks local play routes as transient', async () => {
    await router.navigateByUrl('/play/go');

    expect(document.title).toBe('本機圍棋對局｜gx.go');
    expect(metaName('description')).toContain(
      '依目前瀏覽器 session 顯示對局狀態',
    );
    expect(metaProperty('og:description')).toContain(
      '依目前瀏覽器 session 顯示對局狀態',
    );
    expect(metaName('robots')).toBe('noindex,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/play/go');
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/play/go');
    expect(metaProperty('og:title')).toBe('本機圍棋對局｜gx.go');
    expect(metaName('twitter:card')).toBe('summary_large_image');
    expect(metaName('twitter:title')).toBe('本機圍棋對局｜gx.go');
    expect(metaName('twitter:description')).toContain(
      '依目前瀏覽器 session 顯示對局狀態',
    );
    expect(metaName('twitter:image')).toBe(
      'https://gxgo.synology.me/social/gxgo-og.png',
    );
  });

  it('publishes Gomoku local play metadata as transient', async () => {
    await router.navigateByUrl('/play/gomoku');

    expect(document.title).toBe('本機五子棋對局｜gx.go');
    expect(metaName('description')).toContain(
      '依目前瀏覽器 session 顯示對局狀態',
    );
    expect(metaProperty('og:description')).toContain(
      '依目前瀏覽器 session 顯示對局狀態',
    );
    expect(metaName('robots')).toBe('noindex,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/play/gomoku');
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/play/gomoku');
    expect(metaProperty('og:title')).toBe('本機五子棋對局｜gx.go');
    expect(metaProperty('og:locale')).toBe('zh_TW');
    expect(metaProperty('og:type')).toBe('website');
    expect(metaProperty('og:site_name')).toBe('gx.go');
    expect(metaProperty('og:image')).toBe(
      'https://gxgo.synology.me/social/gxgo-og.png',
    );
    expect(metaName('twitter:card')).toBe('summary_large_image');
    expect(metaName('twitter:title')).toBe('本機五子棋對局｜gx.go');
    expect(metaName('twitter:description')).toContain(
      '依目前瀏覽器 session 顯示對局狀態',
    );
    expect(metaName('twitter:image')).toBe(
      'https://gxgo.synology.me/social/gxgo-og.png',
    );
  });

  it('publishes indexable privacy metadata', async () => {
    await router.navigateByUrl('/privacy');

    expect(document.title).toBe('隱私與 Cookie 偏好｜gx.go');
    expect(metaName('description')).toContain('分析同意');
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/privacy');
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/privacy');
    expect(metaProperty('og:title')).toBe('隱私與 Cookie 偏好｜gx.go');
    expect(metaProperty('og:description')).toContain('分析同意');
    expect(metaName('twitter:title')).toBe('隱私與 Cookie 偏好｜gx.go');
    expect(metaName('twitter:description')).toContain('分析同意');
  });

  it('publishes localized Japanese metadata for the active route', async () => {
    await router.navigateByUrl('/setup/go');

    TestBed.inject(GoI18nService).setLocale('ja-JP');
    TestBed.flushEffects();

    expect(document.title).toBe('オンライン囲碁の対局設定｜gx.go');
    expect(metaName('description')).toContain('9x9、13x13、19x19');
    expect(metaProperty('og:locale')).toBe('ja_JP');
    expect(canonicalHref()).toBe(
      'https://gxgo.synology.me/setup/go?locale=ja-JP',
    );
    expect(metaProperty('og:url')).toBe(
      'https://gxgo.synology.me/setup/go?locale=ja-JP',
    );
    expect(alternateHref('ja-JP')).toBe(
      'https://gxgo.synology.me/setup/go?locale=ja-JP',
    );
    expect(alternateHref('x-default')).toBe(
      'https://gxgo.synology.me/setup/go',
    );
    expect(ogLocaleAlternates()).toEqual(['zh_TW', 'zh_CN', 'en_US']);
    expect(alternateLinkCount()).toBe(5);
    expect(ogLocaleAlternateCount()).toBe(3);
  });

  it('publishes localized Simplified Chinese metadata for the lobby', async () => {
    await router.navigateByUrl('/');

    TestBed.inject(GoI18nService).setLocale('zh-CN');
    TestBed.flushEffects();

    expect(document.title).toBe('gx.go｜在线围棋与五子棋房间');
    expect(metaName('description')).toContain('简中在线围棋与五子棋房间');
    expect(metaProperty('og:locale')).toBe('zh_CN');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/?locale=zh-CN');
    expect(metaProperty('og:url')).toBe(
      'https://gxgo.synology.me/?locale=zh-CN',
    );
    expect(alternateHref('x-default')).toBe('https://gxgo.synology.me/');
    expect(ogLocaleAlternates()).toEqual(['zh_TW', 'ja_JP', 'en_US']);
  });

  it('publishes localized English metadata for a specific route', async () => {
    await router.navigateByUrl('/privacy');

    TestBed.inject(GoI18nService).setLocale('en');
    TestBed.flushEffects();

    expect(document.title).toBe('Privacy and Cookie Preferences | gx.go');
    expect(metaName('description')).toContain('analytics consent');
    expect(metaProperty('og:locale')).toBe('en_US');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/privacy?locale=en');
    expect(alternateHref('x-default')).toBe('https://gxgo.synology.me/privacy');
  });

  it('keeps locale alternate tags idempotent across route and locale changes', async () => {
    const i18n = TestBed.inject(GoI18nService);

    await router.navigateByUrl('/setup/go');
    i18n.setLocale('ja-JP');
    TestBed.flushEffects();

    await router.navigateByUrl('/setup/gomoku');
    i18n.setLocale('zh-CN');
    TestBed.flushEffects();

    expect(canonicalHref()).toBe(
      'https://gxgo.synology.me/setup/gomoku?locale=zh-CN',
    );
    expect(alternateLinkCount()).toBe(5);
    expect(ogLocaleAlternateCount()).toBe(3);
    expect(ogLocaleAlternates()).toEqual(['zh_TW', 'ja_JP', 'en_US']);
    expect(alternateHref('zh-Hans-CN')).toBe(
      'https://gxgo.synology.me/setup/gomoku?locale=zh-CN',
    );
  });

  it('updates existing meta tags across transient and indexable navigation', async () => {
    await router.navigateByUrl('/online/room/ROOM42');

    expect(metaName('robots')).toBe('noindex,follow');
    expect(metaProperty('og:url')).toBe(
      'https://gxgo.synology.me/online/room/ROOM42',
    );

    await router.navigateByUrl('/');

    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/');
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/');
    expect(canonicalLinkCount()).toBe(1);
    expect(metaPropertyCount('og:url')).toBe(1);
    expect(document.title).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaProperty('og:title')).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaProperty('og:description')).toContain(
      '繁中線上圍棋與五子棋房間',
    );
    expect(metaName('twitter:title')).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaName('twitter:description')).toContain(
      '繁中線上圍棋與五子棋房間',
    );
  });

  it('keeps route watching idempotent', async () => {
    TestBed.inject(AppSeoService).watchRouteMetadata();

    await router.navigateByUrl('/setup/go');

    expect(canonicalLinkCount()).toBe(1);
    expect(canonicalHref()).toBe('https://gxgo.synology.me/setup/go');
    expect(metaPropertyCount('og:url')).toBe(1);
    expect(metaProperty('og:url')).toBe('https://gxgo.synology.me/setup/go');
  });
});

function metaName(name: string): string | null {
  return (
    document.head
      .querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      ?.getAttribute('content') ?? null
  );
}

function metaProperty(property: string): string | null {
  return (
    document.head
      .querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      ?.getAttribute('content') ?? null
  );
}

function canonicalHref(): string | null {
  return (
    document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.getAttribute('href') ?? null
  );
}

function alternateHref(hreflang: string): string | null {
  return (
    document.head
      .querySelector<HTMLLinkElement>(
        `link[rel="alternate"][hreflang="${hreflang}"]`,
      )
      ?.getAttribute('href') ?? null
  );
}

function canonicalLinkCount(): number {
  return document.head.querySelectorAll('link[rel="canonical"]').length;
}

function alternateLinkCount(): number {
  return document.head.querySelectorAll('link[rel="alternate"][hreflang]')
    .length;
}

function metaPropertyCount(property: string): number {
  return document.head.querySelectorAll(`meta[property="${property}"]`).length;
}

function ogLocaleAlternateCount(): number {
  return metaPropertyCount('og:locale:alternate');
}

function ogLocaleAlternates(): string[] {
  return [
    ...document.head.querySelectorAll<HTMLMetaElement>(
      'meta[property="og:locale:alternate"]',
    ),
  ].map((element) => element.getAttribute('content') ?? '');
}
