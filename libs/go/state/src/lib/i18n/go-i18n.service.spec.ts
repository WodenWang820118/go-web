import '@angular/compiler';
import { formatDate } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { createMessage } from '@gx/go/domain';
import { GoI18nService } from './go-i18n.service';
import { EN_TRANSLATIONS } from './go-i18n.catalog.en';
import { ZH_TW_TRANSLATIONS } from './go-i18n.catalog.zh-tw';

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

TestBed.initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);

describe('GoI18nService', () => {
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  afterEach(() => {
    TestBed.resetTestingModule();

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
  });

  it('defaults to zh-TW, updates html lang, and persists the selection', async () => {
    const storage = installBrowserGlobals();
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('zh-TW');
    expect(globalThis.document.documentElement.lang).toBe('zh-TW');
    expect(globalThis.document.title).toBe('gx.go');
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

  it('falls back to zh-TW when the persisted locale is unsupported', async () => {
    const storage = installBrowserGlobals({
      'gx.go.locale': 'fr-FR',
    });
    const service = createService();
    flushEffects();

    expect(service.locale()).toBe('zh-TW');
    expect(storage.getItem('gx.go.locale')).toBe('zh-TW');
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
      })
    ).toBe('White wins by 6.5 points.');
  });

  it('switches locale at runtime and exposes locale-aware date formatting', async () => {
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

  it('keeps the en and zh-TW catalogs in parity', () => {
    expect(Object.keys(ZH_TW_TRANSLATIONS).sort()).toEqual(
      Object.keys(EN_TRANSLATIONS).sort()
    );
  });
});

function installBrowserGlobals(initialValues?: Record<string, string>): MockStorage {
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
