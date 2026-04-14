import { EN_TRANSLATIONS } from './go-i18n.catalog.en';
import { ZH_TW_TRANSLATIONS } from './go-i18n.catalog.zh-tw';

export type GoTranslationKey = keyof typeof EN_TRANSLATIONS;

/**
 * Catalog of supported UI translations keyed by locale and translation id.
 */
export const GO_TRANSLATIONS = {
  en: EN_TRANSLATIONS,
  'zh-TW': ZH_TW_TRANSLATIONS,
} as const;
