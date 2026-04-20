// Display helpers for translatable asset fields.
//
// Every component that renders an asset's name or description MUST go through
// these helpers — do not inline fallback logic in components. The fallback
// order below is the user-locked spec:
//
//   nameI18n[locale]              // exact match
//   nameI18n[sourceLanguage]      // creator-authored value
//   name                          // source-language raw field
//
// The same order applies to descriptionI18n / description.

import { toAppLocale, DEFAULT_LOCALE } from '../domain/locales';

/** @typedef {import('../domain/locales').AppLocale} AppLocale */
/** @typedef {import('../domain/repositories/AssetRepository').Asset} Asset */
/** @typedef {import('../domain/repositories/AssetRepository').LocalizedText} LocalizedText */

/**
 * Pick a non-empty string from a LocalizedText object, trimming whitespace.
 * Returns `null` when the key is missing, not a string, or blank after trim.
 *
 * @param {LocalizedText | null | undefined} map
 * @param {AppLocale} locale
 * @returns {string | null}
 */
function pickLocale(map, locale) {
  if (!map || typeof map !== 'object') return null;
  const value = map[locale];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve an asset's display name for the given locale. Never returns
 * `undefined` — if every fallback is blank, returns '' so the caller can
 * safely render it as text.
 *
 * @param {Asset | null | undefined} asset
 * @param {unknown} locale
 * @returns {string}
 */
export function displayAssetName(asset, locale) {
  if (!asset) return '';
  const appLocale = toAppLocale(locale);
  const source = /** @type {AppLocale} */ (toAppLocale(asset.sourceLanguage));
  return (
    pickLocale(asset.nameI18n, appLocale) ??
    (source !== appLocale ? pickLocale(asset.nameI18n, source) : null) ??
    (typeof asset.name === 'string' ? asset.name : '')
  );
}

/**
 * Resolve an asset's display description for the given locale. Returns ''
 * when no source exists.
 *
 * @param {Asset | null | undefined} asset
 * @param {unknown} locale
 * @returns {string}
 */
export function displayAssetDescription(asset, locale) {
  if (!asset) return '';
  const appLocale = toAppLocale(locale);
  const source = /** @type {AppLocale} */ (toAppLocale(asset.sourceLanguage));
  return (
    pickLocale(asset.descriptionI18n, appLocale) ??
    (source !== appLocale ? pickLocale(asset.descriptionI18n, source) : null) ??
    (typeof asset.description === 'string' ? asset.description : '')
  );
}

export { DEFAULT_LOCALE };
