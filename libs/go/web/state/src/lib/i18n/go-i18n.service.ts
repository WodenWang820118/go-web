import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeJa from '@angular/common/locales/ja';
import localeJaExtra from '@angular/common/locales/extra/ja';
import localeZhHans from '@angular/common/locales/zh-Hans';
import localeZhHansExtra from '@angular/common/locales/extra/zh-Hans';
import localeZhHant from '@angular/common/locales/zh-Hant';
import localeZhHantExtra from '@angular/common/locales/extra/zh-Hant';
import { computed, effect, Injectable, signal } from '@angular/core';
import {
  DEFAULT_GO_KOMI,
  GameMode,
  getGameModeMeta,
  GoMessageDescriptor,
  isMessageDescriptor,
  MoveRecord,
  PlayerColor,
} from '@gx/go/domain';
import { GO_TRANSLATIONS, GoTranslationKey } from './go-i18n.catalog';

registerLocaleData(localeEn, 'en');
registerLocaleData(localeJa, 'ja-JP', localeJaExtra);
registerLocaleData(localeZhHans, 'zh-CN', localeZhHansExtra);
registerLocaleData(localeZhHant, 'zh-TW', localeZhHantExtra);

export const GO_DEFAULT_LOCALE = 'zh-TW';
export const GO_SUPPORTED_LOCALES = ['zh-TW', 'zh-CN', 'ja-JP', 'en'] as const;

export type GoLocale = (typeof GO_SUPPORTED_LOCALES)[number];

export interface GoLocaleMetadata {
  readonly locale: GoLocale;
  readonly label: string;
  readonly hreflang: string;
  readonly ogLocale: string;
}

export const GO_LOCALE_METADATA: Record<GoLocale, GoLocaleMetadata> = {
  en: {
    locale: 'en',
    label: 'EN',
    hreflang: 'en',
    ogLocale: 'en_US',
  },
  'ja-JP': {
    locale: 'ja-JP',
    label: '日本語',
    hreflang: 'ja-JP',
    ogLocale: 'ja_JP',
  },
  'zh-CN': {
    locale: 'zh-CN',
    label: '简中',
    hreflang: 'zh-Hans-CN',
    ogLocale: 'zh_CN',
  },
  'zh-TW': {
    locale: 'zh-TW',
    label: '繁中',
    hreflang: 'zh-Hant-TW',
    ogLocale: 'zh_TW',
  },
};

export const GO_LOCALE_OPTIONS = GO_SUPPORTED_LOCALES.map(
  (locale) => GO_LOCALE_METADATA[locale],
);

const LOCALE_STORAGE_KEY = 'gx.go.locale';

type InitialLocaleSource = 'browser' | 'default' | 'query' | 'storage';

interface InitialLocaleResolution {
  readonly locale: GoLocale;
  readonly source: InitialLocaleSource;
}

/**
 * Localized metadata exposed to setup and landing screens.
 */
export interface LocalizedGameModeMeta {
  mode: GameMode;
  title: string;
  strapline: string;
  description: string;
  boardSizes: readonly number[];
  defaultBoardSize: number;
  objective: string;
  help: string[];
  setupHint: string;
}

export function resolveGoBrowserLocale(
  candidates: readonly (string | null | undefined)[],
): GoLocale | null {
  for (const candidate of candidates) {
    const normalized = candidate?.trim();

    if (!normalized) {
      continue;
    }

    if (isSupportedGoLocale(normalized)) {
      return normalized;
    }

    const lower = normalized.toLowerCase();

    if (lower === 'en' || lower.startsWith('en-')) {
      return 'en';
    }

    if (lower === 'ja' || lower.startsWith('ja-')) {
      return 'ja-JP';
    }

    if (
      lower === 'zh-cn' ||
      lower === 'zh-sg' ||
      lower === 'zh-hans' ||
      lower.startsWith('zh-hans-')
    ) {
      return 'zh-CN';
    }

    if (
      lower === 'zh' ||
      lower === 'zh-tw' ||
      lower === 'zh-hk' ||
      lower === 'zh-mo' ||
      lower === 'zh-hant' ||
      lower.startsWith('zh-hant-')
    ) {
      return 'zh-TW';
    }
  }

  return null;
}

/**
 * Locale-aware translation facade for the Go frontend.
 */
@Injectable({ providedIn: 'root' })
export class GoI18nService {
  private readonly initialLocale = this.resolveInitialLocale();
  private readonly localeSignal = signal<GoLocale>(this.initialLocale.locale);
  private skippedInitialQueryPersist = false;

  readonly locale = this.localeSignal.asReadonly();
  readonly languageLabel = computed(() => this.t('locale.switcher.label'));

  constructor() {
    effect(() => {
      const locale = this.localeSignal();

      if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
      }

      if (
        this.initialLocale.source === 'query' &&
        !this.skippedInitialQueryPersist
      ) {
        this.skippedInitialQueryPersist = true;
        return;
      }

      this.persistLocale(locale);
    });
  }

  setLocale(locale: GoLocale): void {
    this.localeSignal.set(locale);
  }

  toggleLocale(): void {
    const currentIndex = GO_SUPPORTED_LOCALES.indexOf(this.localeSignal());
    const nextLocale =
      GO_SUPPORTED_LOCALES[(currentIndex + 1) % GO_SUPPORTED_LOCALES.length];

    this.setLocale(nextLocale);
  }

  isActiveLocale(locale: GoLocale): boolean {
    return this.localeSignal() === locale;
  }

  localeOptionLabel(locale: GoLocale): string {
    return GO_LOCALE_METADATA[locale].label;
  }

  t(
    key: GoTranslationKey | string,
    params?: GoMessageDescriptor['params'],
  ): string {
    const template =
      GO_TRANSLATIONS[this.localeSignal()][key as GoTranslationKey] ?? key;

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, paramKey) => {
      const value = params?.[paramKey];

      if (isMessageDescriptor(value)) {
        return this.translateMessage(value);
      }

      return value === undefined || value === null ? '' : String(value);
    });
  }

  translateMessage(descriptor: GoMessageDescriptor | null | undefined): string {
    if (!descriptor) {
      return '';
    }

    return this.t(descriptor.key, descriptor.params);
  }

  playerLabel(color: PlayerColor): string {
    return this.t(`common.player.${color}`);
  }

  moveNotation(move: MoveRecord): string {
    switch (move.command.type) {
      case 'pass':
        return this.t('common.move.pass');
      case 'resign':
        return this.t('common.move.resign');
      default:
        return move.notation;
    }
  }

  gameModeMeta(mode: GameMode): LocalizedGameModeMeta {
    const meta = getGameModeMeta(mode);
    const helpCount = mode === 'go' ? 5 : 4;

    return {
      ...meta,
      title: this.t(`mode.${mode}.title`),
      strapline: this.t(`mode.${mode}.strapline`),
      description: this.t(`mode.${mode}.description`),
      objective: this.t(`mode.${mode}.objective`),
      help: Array.from({ length: helpCount }, (_, index) =>
        this.t(`mode.${mode}.help.${index}`, {
          komi: DEFAULT_GO_KOMI,
        }),
      ),
      setupHint: this.t(`mode.${mode}.setup_hint`),
    };
  }

  private resolveInitialLocale(): InitialLocaleResolution {
    const queryLocale = this.readQueryLocale();

    if (queryLocale) {
      return { locale: queryLocale, source: 'query' };
    }

    const storedLocale = this.readStoredLocale();

    if (storedLocale) {
      return { locale: storedLocale, source: 'storage' };
    }

    const browserLocale = resolveGoBrowserLocale(this.readBrowserLocales());

    if (browserLocale) {
      return { locale: browserLocale, source: 'browser' };
    }

    return { locale: GO_DEFAULT_LOCALE, source: 'default' };
  }

  private readQueryLocale(): GoLocale | null {
    if (typeof location === 'undefined') {
      return null;
    }

    try {
      const candidate = new URLSearchParams(location.search).get('locale');
      return isSupportedGoLocale(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }

  private readStoredLocale(): GoLocale | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

      return isSupportedGoLocale(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  private readBrowserLocales(): readonly string[] {
    if (typeof navigator === 'undefined') {
      return [];
    }

    const languages = Array.isArray(navigator.languages)
      ? navigator.languages
      : [];
    const language = navigator.language ? [navigator.language] : [];

    return [...languages, ...language];
  }

  private persistLocale(locale: GoLocale): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage failures and keep the in-memory selection.
    }
  }
}

function isSupportedGoLocale(locale: string | null): locale is GoLocale {
  return GO_SUPPORTED_LOCALES.includes(locale as GoLocale);
}
