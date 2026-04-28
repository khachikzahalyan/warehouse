// src/utils/formatDate.js
// Locale-aware date formatting for read-only UI surfaces (Details panel,
// Edit drawer label rows, etc.). NEVER use this for <input type="date">
// values — those need ISO yyyy-mm-dd. Use `dateToInputValue` in the form
// helpers for that.
//
// Format contract per design (2026-04-27):
//   ru, hy → "DD.MM.YYYY"
//   en     → "MM/DD/YYYY"
//
// Implementation uses Intl.DateTimeFormat with explicit numeric options
// keyed off the active i18n language. We don't trust the runtime's default
// locale formatting for `en` (Node's Intl can return "M/D/YYYY" without
// padding), so we hand-build the output for full control. Output is
// strictly numeric — no localized month names — which matches the design
// spec and stays narrow on mobile.

/**
 * @param {Date | string | number | null | undefined} value
 * @param {string} language    The active i18n language (e.g. 'en', 'ru', 'hy').
 * @returns {string | null}     Formatted string, or null if the input is invalid / empty.
 */
export function formatDate(value, language) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear()).padStart(4, '0');

  // Normalize language to its primary tag so 'en-US', 'ru-RU' all match.
  const lng = (typeof language === 'string' ? language : 'en').slice(0, 2).toLowerCase();

  if (lng === 'en') return `${mm}/${dd}/${yyyy}`;
  // Default for ru / hy / anything else.
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Format a (start, end) pair as a single range string. Returns null when
 * BOTH ends are missing; returns just one side when the other is missing.
 *
 * Uses an em-dash with surrounding spaces (per design): "DD.MM.YYYY — DD.MM.YYYY".
 *
 * @param {Date | string | number | null | undefined} start
 * @param {Date | string | number | null | undefined} end
 * @param {string} language
 * @returns {string | null}
 */
export function formatDateRange(start, end, language) {
  const s = formatDate(start, language);
  const e = formatDate(end, language);
  if (!s && !e) return null;
  if (s && !e) return s;
  if (!s && e) return e;
  return `${s} — ${e}`;
}
