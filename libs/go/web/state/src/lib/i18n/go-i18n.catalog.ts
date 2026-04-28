import { EN_TRANSLATIONS } from './go-i18n.catalog.en';
import { JA_JP_TRANSLATIONS } from './go-i18n.catalog.ja-jp';
import { ZH_CN_TRANSLATIONS } from './go-i18n.catalog.zh-cn';
import { ZH_TW_TRANSLATIONS } from './go-i18n.catalog.zh-tw';

export type GoTranslationKey = keyof typeof EN_TRANSLATIONS;
export type GoTranslationCatalog = Record<GoTranslationKey, string>;

/**
 * Catalog of supported UI translations keyed by locale and translation id.
 */
export const GO_TRANSLATIONS = {
  en: EN_TRANSLATIONS,
  'ja-JP': JA_JP_TRANSLATIONS,
  'zh-CN': ZH_CN_TRANSLATIONS,
  'zh-TW': ZH_TW_TRANSLATIONS,
} as const satisfies Record<string, GoTranslationCatalog>;
