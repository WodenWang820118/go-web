import '@angular/compiler';
import { formatDate } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { createMessage, MoveRecord } from '@gx/go/domain';
import { EN_TRANSLATIONS } from './go-i18n.catalog.en';
import { JA_JP_TRANSLATIONS } from './go-i18n.catalog.ja-jp';
import { ZH_CN_TRANSLATIONS } from './go-i18n.catalog.zh-cn';
import { ZH_TW_TRANSLATIONS } from './go-i18n.catalog.zh-tw';
import {
  GO_LOCALE_OPTIONS,
  GoI18nService,
  resolveGoBrowserLocale,
} from './go-i18n.service';

class MockStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

describe('GoI18nService', () => {
  const originalDocument = globalThis.document;
  const originalLocation = globalThis.location;
  const originalLocalStorage = globalThis.localStorage;
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    TestBed.resetTestingModule();
    setBrowserUrl('/');

    if (originalDocument === undefined) {
      delete (globalThis as { document?: Document }).document;
    } else {
      globalThis.document = originalDocument;
    }

    if (originalLocalStorage === undefined) {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    } else {
      globalThis.localStorage = originalLocalStorage;
    }

    if (originalLocation === undefined) {
      delete (globalThis as { location?: Location }).location;
    } else {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('defaults to zh-TW, updates html lang, and persists the selection', async () => {
    setNavigatorLanguages(['fr-FR']);
    const storage = installBrowserGlobals();
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('zh-TW');
    expect(globalThis.document.documentElement.lang).toBe('zh-TW');
    expect(storage.getItem('gx.go.locale')).toBe('zh-TW');
    expect(service.t('common.player.black')).toBe('黑方');
  });

  it('uses the persisted locale override on first load', async () => {
    const storage = installBrowserGlobals({
      'gx.go.locale': 'en',
    });
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('en');
    expect(globalThis.document.documentElement.lang).toBe('en');
    expect(storage.getItem('gx.go.locale')).toBe('en');
    expect(service.t('common.player.black')).toBe('Black');
  });

  it('uses the query locale for the current page without clobbering storage', async () => {
    setBrowserUrl('/?locale=ja-JP');
    const storage = installBrowserGlobals({
      'gx.go.locale': 'en',
    });
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('ja-JP');
    expect(globalThis.document.documentElement.lang).toBe('ja-JP');
    expect(storage.getItem('gx.go.locale')).toBe('en');
    expect(service.t('common.player.black')).toBe('黒番');
  });

  it('ignores an unsupported query locale and falls back to storage', async () => {
    setBrowserUrl('/?locale=fr-FR');
    installBrowserGlobals({
      'gx.go.locale': 'en',
    });
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('en');
  });

  it('uses browser languages when no query or stored preference exists', async () => {
    setNavigatorLanguages(['ja', 'en-US']);
    const storage = installBrowserGlobals();
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('ja-JP');
    expect(globalThis.document.documentElement.lang).toBe('ja-JP');
    expect(storage.getItem('gx.go.locale')).toBe('ja-JP');
  });

  it('falls back to browser/default locale when the persisted locale is unsupported', async () => {
    setNavigatorLanguages(['zh-Hans-CN']);
    const storage = installBrowserGlobals({
      'gx.go.locale': 'fr-FR',
    });
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('zh-CN');
    expect(storage.getItem('gx.go.locale')).toBe('zh-CN');
  });

  it('matches browser language tags deterministically', () => {
    expect(resolveGoBrowserLocale(['en-US'])).toBe('en');
    expect(resolveGoBrowserLocale(['ja'])).toBe('ja-JP');
    expect(resolveGoBrowserLocale(['zh-Hans'])).toBe('zh-CN');
    expect(resolveGoBrowserLocale(['zh-SG'])).toBe('zh-CN');
    expect(resolveGoBrowserLocale(['zh-HK'])).toBe('zh-TW');
    expect(resolveGoBrowserLocale(['zh-MO'])).toBe('zh-TW');
    expect(resolveGoBrowserLocale(['zh-Hant'])).toBe('zh-TW');
    expect(resolveGoBrowserLocale(['zh-Hant-TW'])).toBe('zh-TW');
    expect(resolveGoBrowserLocale(['zh'])).toBe('zh-TW');
    expect(resolveGoBrowserLocale(['fr-FR'])).toBeNull();
  });

  it('interpolates params and nested message descriptors', async () => {
    installBrowserGlobals({
      'gx.go.locale': 'en',
    });
    const service = createService();
    flushEffects();

    expect(
      service.t('game.result.win_by_points', {
        winner: createMessage('common.player.white'),
        margin: 6.5,
      }),
    ).toBe('White wins by 6.5 points.');
  });

  it('switches locale at runtime and exposes locale-aware date formatting', async () => {
    setNavigatorLanguages(['fr-FR']);
    const storage = installBrowserGlobals();
    const service = createService();
    const sampleDate = '2026-03-24T13:05:00.000Z';
    flushEffects();

    service.setLocale('en');
    flushEffects();

    const zhTime = formatDate(sampleDate, 'shortTime', 'zh-TW', 'UTC');
    const enTime = formatDate(sampleDate, 'shortTime', 'en', 'UTC');

    expect(service.locale()).toBe('en');
    expect(globalThis.document.documentElement.lang).toBe('en');
    expect(storage.getItem('gx.go.locale')).toBe('en');
    expect(zhTime).not.toBe(enTime);
  });

  it('cycles through every supported locale', async () => {
    setNavigatorLanguages(['fr-FR']);
    installBrowserGlobals();
    const service = createService();
    flushEffects();

    service.toggleLocale();
    expect(service.locale()).toBe('zh-CN');

    service.toggleLocale();
    expect(service.locale()).toBe('ja-JP');

    service.toggleLocale();
    expect(service.locale()).toBe('en');

    service.toggleLocale();
    expect(service.locale()).toBe('zh-TW');
  });

  it('translates public helper methods through the active locale', async () => {
    setNavigatorLanguages(['fr-FR']);
    installBrowserGlobals();
    const service = createService();
    flushEffects();

    expect(service.isActiveLocale('zh-TW')).toBe(true);
    expect(service.isActiveLocale('en')).toBe(false);
    expect(service.playerLabel('black')).toBe('黑方');
    expect(service.translateMessage(null)).toBe('');
    expect(service.translateMessage(undefined)).toBe('');
    expect(
      service.moveNotation({
        command: { type: 'pass' },
        notation: 'pass',
      } as MoveRecord),
    ).toBe('虛手');
    expect(
      service.moveNotation({
        command: { type: 'resign', player: 'black' },
        notation: 'resign',
      } as MoveRecord),
    ).toBe('認輸');
  });

  it('exposes dropdown-ready locale labels', () => {
    expect(GO_LOCALE_OPTIONS.map((option) => option.label)).toEqual([
      '繁中',
      '简中',
      '日本語',
      'EN',
    ]);
  });

  it('keeps all locale catalogs in parity', () => {
    const expectedKeys = Object.keys(EN_TRANSLATIONS).sort();

    expect(Object.keys(ZH_TW_TRANSLATIONS).sort()).toEqual(expectedKeys);
    expect(Object.keys(ZH_CN_TRANSLATIONS).sort()).toEqual(expectedKeys);
    expect(Object.keys(JA_JP_TRANSLATIONS).sort()).toEqual(expectedKeys);
  });

  it('keeps representative non-English catalog values translated', () => {
    for (const key of [
      'locale.switcher.label',
      'common.player.black',
      'mode.go.title',
    ] as const) {
      expect(ZH_TW_TRANSLATIONS[key]).not.toBe(EN_TRANSLATIONS[key]);
      expect(ZH_CN_TRANSLATIONS[key]).not.toBe(EN_TRANSLATIONS[key]);
      expect(JA_JP_TRANSLATIONS[key]).not.toBe(EN_TRANSLATIONS[key]);
    }

    expect(ZH_TW_TRANSLATIONS['locale.switcher.label']).toBe('語言');
    expect(ZH_CN_TRANSLATIONS['locale.switcher.label']).toBe('语言');
    expect(JA_JP_TRANSLATIONS['locale.switcher.label']).toBe('言語');
  });
});

function installBrowserGlobals(
  initialValues?: Record<string, string>,
): MockStorage {
  const storage = new MockStorage();

  for (const [key, value] of Object.entries(initialValues ?? {})) {
    storage.setItem(key, value);
  }

  globalThis.document = {
    documentElement: {
      lang: '',
    },
    title: '',
  } as Document;
  globalThis.localStorage = storage;

  return storage;
}

function createService(): GoI18nService {
  TestBed.configureTestingModule({
    providers: [GoI18nService],
  });

  return TestBed.inject(GoI18nService);
}

function flushEffects(): void {
  TestBed.flushEffects();
}

function setBrowserUrl(path: string): void {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      search: new URL(path, 'https://gxgo.test').search,
    },
  });
}

function setNavigatorLanguages(languages: readonly string[]): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      language: languages[0] ?? '',
      languages,
    },
  });
}
