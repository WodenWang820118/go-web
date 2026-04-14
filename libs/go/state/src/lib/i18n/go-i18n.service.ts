import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
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
registerLocaleData(localeZhHant, 'zh-TW', localeZhHantExtra);

const SUPPORTED_GO_LOCALES = ['zh-TW', 'en'] as const;
const LOCALE_STORAGE_KEY = 'gx.go.locale';

export type GoLocale = (typeof SUPPORTED_GO_LOCALES)[number];

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

/**
 * Locale-aware translation facade for the Go frontend.
 */
@Injectable({ providedIn: 'root' })
export class GoI18nService {
  private readonly localeSignal = signal<GoLocale>(this.readInitialLocale());

  readonly locale = this.localeSignal.asReadonly();
  readonly languageLabel = computed(() => this.t('locale.switcher.label'));

  constructor() {
    effect(() => {
      const locale = this.localeSignal();

      if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
        document.title = this.t('app.title');
      }

      this.persistLocale(locale);
    });
  }

  setLocale(locale: GoLocale): void {
    this.localeSignal.set(locale);
  }

  toggleLocale(): void {
    this.setLocale(this.localeSignal() === 'zh-TW' ? 'en' : 'zh-TW');
  }

  isActiveLocale(locale: GoLocale): boolean {
    return this.localeSignal() === locale;
  }

  localeOptionLabel(locale: GoLocale): string {
    return locale === 'zh-TW' ? '繁中' : 'EN';
  }

  t(
    key: GoTranslationKey | string,
    params?: GoMessageDescriptor['params']
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

  translateMessage(
    descriptor: GoMessageDescriptor | null | undefined
  ): string {
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
        })
      ),
      setupHint: this.t(`mode.${mode}.setup_hint`),
    };
  }

  private readInitialLocale(): GoLocale {
    if (typeof localStorage === 'undefined') {
      return SUPPORTED_GO_LOCALES[0];
    }

    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

      return this.isSupportedLocale(stored) ? stored : SUPPORTED_GO_LOCALES[0];
    } catch {
      return SUPPORTED_GO_LOCALES[0];
    }
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

  private isSupportedLocale(locale: string | null): locale is GoLocale {
    return SUPPORTED_GO_LOCALES.includes(locale as GoLocale);
  }
}
