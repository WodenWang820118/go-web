// @vitest-environment jsdom

import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { Injector } from '@angular/core';
import { GO_ANALYTICS_CONFIG } from './go-analytics-config.token';
import { GoAnalyticsConsentService } from './go-analytics-consent.service';
import {
  buildGoAnalyticsPageViewEvent,
  GoAnalyticsService,
} from './go-analytics.service';

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
  });

  it('does not push events or load GTM before analytics consent is granted', () => {
    service.track({
      event: 'gx_room_join',
      join_source: 'direct_room',
    });

    expect(window.dataLayer).toEqual([]);
    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
  });

  it('loads GTM idempotently and pushes events after consent is accepted', () => {
    consent.accept();

    service.track({
      event: 'gx_room_join',
      join_source: 'direct_room',
    });
    service.track({
      event: 'gx_room_join',
      join_source: 'lobby',
    });

    expect(
      document.querySelectorAll('script[id^="gx-gtm-script-"]'),
    ).toHaveLength(1);
    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
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
          event: 'gx_room_join',
          join_source: 'direct_room',
        },
        {
          event: 'gx_room_join',
          join_source: 'lobby',
        },
      ]),
    );
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
      event: 'gx_room_join',
      join_source: 'direct_room',
    });

    expect(window.dataLayer).toContainEqual({
      event: 'gx_room_join',
      join_source: 'direct_room',
    });
  });

  it('keeps explicit denied consent from pushing events', () => {
    consent.decline();

    service.track({
      event: 'gx_room_join',
      join_source: 'direct_room',
    });

    expect(window.dataLayer).toEqual([]);
  });

  it('deduplicates repeated page views after consent but not before consent', () => {
    service.trackPageView('/play/go');
    expect(window.dataLayer).toEqual([]);

    consent.accept();
    service.trackPageView('/play/go');
    service.trackPageView('/play/go');

    expect(
      window.dataLayer?.filter((entry) => entry.event === 'gx_page_view'),
    ).toEqual([
      {
        event: 'gx_page_view',
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
      event: 'gx_page_view',
      page_path_normalized: '/online/room/:roomId',
      play_context: 'hosted',
      route_group: 'online_room',
    });
    expect(buildGoAnalyticsPageViewEvent('/play/gomoku')).toEqual({
      event: 'gx_page_view',
      game_mode: 'gomoku',
      page_path_normalized: '/play/gomoku',
      play_context: 'local',
      route_group: 'local_play',
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
      event: 'gx_room_join',
      join_source: 'direct_room',
    });

    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
    expect(window.dataLayer).toContainEqual({
      event: 'gx_room_join',
      join_source: 'direct_room',
    });
  });
});
