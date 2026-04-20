// Canonical locale enum for the app.
//
// Single source of truth: any module that needs to narrow an unknown value to
// a supported locale goes through toAppLocale(). Keep this file in sync with
// the Firestore schema (`firestore-schema-v1.md` §4.4 assets.sourceLanguage
// and §4.1 users.preferredLocale) and with the translation-resource folders
// under `src/locales/<lang>/`.
//
// Display order below reflects UX priority: 'hy' (Armenian, default UI
// language), 'en' (fallback when a translation is missing), 'ru' (third
// locale shipped in Iteration 1).

/**
 * @typedef {'hy' | 'en' | 'ru'} AppLocale
 */

/** All supported app locales, in display / fallback order. */
export const APP_LOCALES = Object.freeze(['hy', 'en', 'ru']);

/** Default locale used when detection and user preference both fail. */
export const DEFAULT_LOCALE = /** @type {AppLocale} */ ('hy');

/** Fallback chain order consumed by i18next and by displayAssetName. */
export const FALLBACK_LOCALE_CHAIN = Object.freeze(
  /** @type {AppLocale[]} */ (['hy', 'en'])
);

/**
 * Narrow an unknown value to an AppLocale. Unknown → DEFAULT_LOCALE.
 * @param {unknown} value
 * @returns {AppLocale}
 */
export function toAppLocale(value) {
  return APP_LOCALES.includes(/** @type {AppLocale} */ (value))
    ? /** @type {AppLocale} */ (value)
    : DEFAULT_LOCALE;
}
