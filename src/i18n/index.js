// i18next initialization — single source of truth for localization.
//
// Fallback chain: hy (default) -> en. Russian (ru) is a third shipped locale
// that does NOT participate in the fallback chain (ru users who hit a
// missing key see the English fallback, not Armenian).
//
// Detection order: localStorage -> navigator -> DEFAULT_LOCALE.
// Persist the picked language to localStorage under `warehouse.lang` so a
// server round-trip or tab reopen preserves the user's choice.
//
// In Iteration 1 we ship a single namespace (`common`) to keep the resource
// footprint small. Split into feature namespaces once a locale file exceeds
// ~200 keys (see plan §2.1).

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE_CHAIN,
} from '../domain/locales';

import hyCommon from '../locales/hy/common.json';
import enCommon from '../locales/en/common.json';
import ruCommon from '../locales/ru/common.json';
import enWarehouse from '../locales/en/warehouse.json';
import ruWarehouse from '../locales/ru/warehouse.json';
import hyWarehouse from '../locales/hy/warehouse.json';

export const I18N_STORAGE_KEY = 'warehouse.lang';

const resources = {
  hy: { common: hyCommon, warehouse: hyWarehouse },
  en: { common: enCommon, warehouse: enWarehouse },
  ru: { common: ruCommon, warehouse: ruWarehouse },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...APP_LOCALES],
    fallbackLng: [...FALLBACK_LOCALE_CHAIN],
    lng: undefined, // let the detector decide; falls back to fallbackLng
    defaultNS: 'common',
    ns: ['common', 'warehouse'],

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: I18N_STORAGE_KEY,
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    returnNull: false,
  });

export { DEFAULT_LOCALE };
export default i18n;
