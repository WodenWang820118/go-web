// @vitest-environment jsdom

import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { Injector } from '@angular/core';
import { GO_ANALYTICS_CONFIG } from './go-analytics-config.token';
import { GoAnalyticsConsentService } from './go-analytics-consent.service';
import {
  buildGoAnalyticsLevelName,
  buildGoAnalyticsPageViewEvent,
  GoAnalyticsService,
  serializeGoAnalyticsEvent,
} from './go-analytics.service';
import { GoAnalyticsEvent } from './go-analytics.types';

describe('GoAnalyticsService', () => {
  let consent: GoAnalyticsConsentService;
  let service: GoAnalyticsService;

  beforeEach(() => {
    document.head
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());
    window.dataLayer = [];
    localStorage.clear();

    const injector = Injector.create({
      providers: [
        GoAnalyticsConsentService,
        GoAnalyticsService,
        {
          provide: DOCUMENT,
          useValue: document,
        },
        {
          provide: GO_ANALYTICS_CONFIG,
          useValue: {
            containerId: 'GTM-TQXTJ3LC',
            enabled: true,
          },
        },
      ],
    });

    consent = injector.get(GoAnalyticsConsentService);
    service = injector.get(GoAnalyticsService);
  });

  afterEach(() => {
    document.head
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());
    window.dataLayer = [];
    localStorage.clear();
    clearDocumentCookies();
  });

  it('initializes denied consent defaults without loading GTM before analytics consent is granted', () => {
    service.track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });

    expect(window.dataLayer).toEqual([
      [
        'consent',
        'default',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'denied',
        },
      ],
    ]);
    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
  });

  it('grants analytics consent, loads GTM, and tracks the current page', () => {
    service.grantAnalyticsConsent();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('granted');
    expect(
      document.querySelectorAll('script[id^="gx-gtm-script-"]'),
    ).toHaveLength(1);
    expect(window.dataLayer?.slice(0, 4)).toEqual([
      [
        'consent',
        'default',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'denied',
        },
      ],
      [
        'consent',
        'update',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'granted',
        },
      ],
      expect.objectContaining({ event: 'gtm.js' }),
      {
        event: 'page_view',
        page_path_normalized: '/',
        play_context: 'hosted',
        route_group: 'lobby',
      },
    ]);
  });

  it('loads GTM idempotently and pushes events after consent is accepted', () => {
    consent.accept();

    service.track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });
    service.track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'lobby',
    });

    expect(
      document.querySelectorAll('script[id^="gx-gtm-script-"]'),
    ).toHaveLength(1);
    expect(window.dataLayer?.slice(0, 5)).toEqual([
      [
        'consent',
        'default',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'denied',
        },
      ],
      [
        'consent',
        'update',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'granted',
        },
      ],
      expect.objectContaining({ event: 'gtm.js' }),
      {
        event: 'join_group',
        group_id: 'online_room',
        join_source: 'direct_room',
      },
      {
        event: 'join_group',
        group_id: 'online_room',
        join_source: 'lobby',
      },
    ]);
  });

  it('honors pre-seeded granted consent at service creation time', () => {
    document.head
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());
    window.dataLayer = [];
    localStorage.setItem('gx.analyticsConsent.v1', 'granted');

    const injector = Injector.create({
      providers: [
        GoAnalyticsConsentService,
        GoAnalyticsService,
        {
          provide: DOCUMENT,
          useValue: document,
        },
        {
          provide: GO_ANALYTICS_CONFIG,
          useValue: {
            containerId: 'GTM-TQXTJ3LC',
            enabled: true,
          },
        },
      ],
    });

    injector.get(GoAnalyticsService).track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });

    expect(
      document.querySelectorAll('script[id^="gx-gtm-script-"]'),
    ).toHaveLength(1);
    expect(window.dataLayer?.slice(0, 3)).toEqual([
      [
        'consent',
        'default',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'denied',
        },
      ],
      [
        'consent',
        'update',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'granted',
        },
      ],
      expect.objectContaining({ event: 'gtm.js' }),
    ]);
    expect(window.dataLayer).toContainEqual({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });
  });

  it('honors pre-seeded denied consent at service creation time', () => {
    document.head
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());
    window.dataLayer = [];
    localStorage.setItem('gx.analyticsConsent.v1', 'denied');

    const injector = Injector.create({
      providers: [
        GoAnalyticsConsentService,
        GoAnalyticsService,
        {
          provide: DOCUMENT,
          useValue: document,
        },
        {
          provide: GO_ANALYTICS_CONFIG,
          useValue: {
            containerId: 'GTM-TQXTJ3LC',
            enabled: true,
          },
        },
      ],
    });

    injector.get(GoAnalyticsService).track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });

    expect(window.dataLayer).toEqual([
      [
        'consent',
        'default',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'denied',
        },
      ],
    ]);
    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
  });

  it('keeps explicit denied consent from pushing events', () => {
    consent.decline();

    service.track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });

    expect(window.dataLayer).toEqual([
      [
        'consent',
        'default',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'denied',
        },
      ],
    ]);
  });

  it('denies analytics consent, updates consent state, and blocks future events', () => {
    service.grantAnalyticsConsent();

    service.denyAnalyticsConsent();
    service.track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('denied');
    expect(window.dataLayer).toContainEqual([
      'consent',
      'update',
      {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'denied',
      },
    ]);
    expect(
      window.dataLayer?.filter((entry) => entry.event === 'join_group'),
    ).toEqual([]);
  });

  it('can deny and re-grant consent without duplicating GTM while tracking the page again', () => {
    service.grantAnalyticsConsent();
    service.denyAnalyticsConsent();
    service.grantAnalyticsConsent();

    expect(
      document.querySelectorAll('script[id^="gx-gtm-script-"]'),
    ).toHaveLength(1);
    expect(
      window.dataLayer?.filter((entry) => entry.event === 'page_view'),
    ).toHaveLength(2);
  });

  it('clears first-party Google Analytics cookies on deny best-effort', () => {
    document.cookie = '_ga=GA1.1.123; path=/';
    document.cookie = '_gid=GA1.1.456; path=/';
    document.cookie = '_gat_gtag_GTM_TQXTJ3LC=1; path=/';
    document.cookie = 'gx.preference=keep; path=/';

    service.denyAnalyticsConsent();

    expect(document.cookie).not.toContain('_ga=');
    expect(document.cookie).not.toContain('_gid=');
    expect(document.cookie).not.toContain('_gat_gtag_GTM_TQXTJ3LC=');
    expect(document.cookie).toContain('gx.preference=keep');
  });

  it('does not throw when cookies are unavailable during deny', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() {
        throw new Error('cookies unavailable');
      },
      set() {
        throw new Error('cookies unavailable');
      },
    });

    try {
      expect(() => service.denyAnalyticsConsent()).not.toThrow();
    } finally {
      delete (document as { cookie?: string }).cookie;
    }
  });

  it('deduplicates repeated page views after consent but not before consent', () => {
    service.trackPageView('/play/go');
    expect(window.dataLayer).toEqual([
      [
        'consent',
        'default',
        {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'denied',
        },
      ],
    ]);

    consent.accept();
    service.trackPageView('/play/go');
    service.trackPageView('/play/go');

    expect(
      window.dataLayer?.filter((entry) => entry.event === 'page_view'),
    ).toEqual([
      {
        event: 'page_view',
        game_mode: 'go',
        page_path_normalized: '/play/go',
        play_context: 'local',
        route_group: 'local_play',
      },
    ]);
  });

  it('tracks once-per-key events only after consent is granted', () => {
    service.trackOnce('first-move:A', {
      board_size: 19,
      event: 'gx_match_first_move',
      game_mode: 'go',
      play_context: 'local',
    });
    consent.accept();
    service.trackOnce('first-move:A', {
      board_size: 19,
      event: 'gx_match_first_move',
      game_mode: 'go',
      play_context: 'local',
    });
    service.trackOnce('first-move:A', {
      board_size: 19,
      event: 'gx_match_first_move',
      game_mode: 'go',
      play_context: 'local',
    });

    expect(
      window.dataLayer?.filter(
        (entry) => entry.event === 'gx_match_first_move',
      ),
    ).toHaveLength(1);
  });

  it('normalizes route analytics without leaking room ids or query strings', () => {
    expect(
      buildGoAnalyticsPageViewEvent('/online/room/ROOM42?invite=abc'),
    ).toEqual({
      event: 'page_view',
      page_path_normalized: '/online/room/:roomId',
      play_context: 'hosted',
      route_group: 'online_room',
    });
    expect(buildGoAnalyticsPageViewEvent('/')).toEqual({
      event: 'page_view',
      page_path_normalized: '/',
      play_context: 'hosted',
      route_group: 'lobby',
    });
    expect(buildGoAnalyticsPageViewEvent('/setup/go')).toEqual({
      event: 'page_view',
      game_mode: 'go',
      page_path_normalized: '/setup/go',
      route_group: 'setup',
    });
    expect(buildGoAnalyticsPageViewEvent('/setup/gomoku')).toEqual({
      event: 'page_view',
      game_mode: 'gomoku',
      page_path_normalized: '/setup/gomoku',
      route_group: 'setup',
    });
    expect(buildGoAnalyticsPageViewEvent('/play/gomoku')).toEqual({
      event: 'page_view',
      game_mode: 'gomoku',
      page_path_normalized: '/play/gomoku',
      play_context: 'local',
      route_group: 'local_play',
    });
    expect(buildGoAnalyticsPageViewEvent('/admin/settings')).toEqual({
      event: 'page_view',
      page_path_normalized: '/admin/settings',
      route_group: 'unknown',
    });
    expect(
      buildGoAnalyticsPageViewEvent('/privacy?source=banner#cookies'),
    ).toEqual({
      event: 'page_view',
      page_path_normalized: '/privacy',
      route_group: 'privacy',
    });
  });

  it('can be disabled through the analytics config token', () => {
    window.dataLayer = [];
    const injector = Injector.create({
      providers: [
        GoAnalyticsConsentService,
        GoAnalyticsService,
        {
          provide: DOCUMENT,
          useValue: document,
        },
        {
          provide: GO_ANALYTICS_CONFIG,
          useValue: {
            containerId: 'GTM-TQXTJ3LC',
            enabled: false,
          },
        },
      ],
    });
    consent = injector.get(GoAnalyticsConsentService);
    service = injector.get(GoAnalyticsService);

    consent.accept();
    service.track({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });

    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
    expect(window.dataLayer).toContainEqual({
      event: 'join_group',
      group_id: 'online_room',
      join_source: 'direct_room',
    });
  });

  it('serializes rollback schema events without dual emitting', () => {
    expect(
      serializeGoAnalyticsEvent(
        {
          board_size: 19,
          event: 'level_start',
          game_mode: 'go',
          level_name: 'local_go_19',
          play_context: 'local',
          start_source: 'setup',
        },
        'legacy',
      ),
    ).toEqual({
      board_size: 19,
      event: 'gx_match_start',
      game_mode: 'go',
      play_context: 'local',
      start_source: 'setup',
    });

    expect(
      serializeGoAnalyticsEvent(
        {
          event: 'join_group',
          group_id: 'online_room',
          join_source: 'lobby',
        },
        'legacy',
      ),
    ).toEqual({
      event: 'gx_room_join',
      join_source: 'lobby',
    });

    expect(
      serializeGoAnalyticsEvent(
        {
          board_size: 19,
          event: 'level_end',
          game_mode: 'go',
          level_name: 'local_go_19',
          move_count: 12,
          play_context: 'local',
          result_reason: 'score',
          success: true,
          winner: 'black',
        },
        'legacy',
      ),
    ).toEqual({
      board_size: 19,
      event: 'gx_match_end',
      game_mode: 'go',
      move_count: 12,
      play_context: 'local',
      result_reason: 'score',
      winner: 'black',
    });

    expect(
      serializeGoAnalyticsEvent(
        {
          event: 'page_view',
          page_path_normalized: '/setup/go',
          route_group: 'setup',
          game_mode: 'go',
        },
        'legacy',
      ),
    ).toEqual({
      event: 'gx_page_view',
      page_path_normalized: '/setup/go',
      route_group: 'setup',
      game_mode: 'go',
    });
  });

  it('builds consistent level names and strips forbidden custom keys', () => {
    consent.accept();

    expect(buildGoAnalyticsLevelName('hosted', 'gomoku', 15)).toBe(
      'hosted_gomoku_15',
    );

    service.track({
      event: 'share',
      method: 'copy_link',
      content_type: 'online_room',
      item_id: 'hosted_room_invite',
      roomId: 'ROOM42',
      shareUrl: 'http://localhost/online/room/ROOM42',
    } as GoAnalyticsEvent);

    expect(window.dataLayer).toContainEqual({
      event: 'share',
      method: 'copy_link',
      content_type: 'online_room',
      item_id: 'hosted_room_invite',
    });
  });
});

function clearDocumentCookies(): void {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();

    if (name) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}
