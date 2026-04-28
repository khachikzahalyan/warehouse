// src/hooks/useCustomKinds.js
// Live subscription to /settings/global_lists/assetKinds, exposed as a
// merged, render-ready list of "kind options" the segmented control can
// consume directly.
//
// The hook always emits the hardcoded ASSET_KINDS first (in their canonical
// order) and appends any super_admin-defined custom kinds afterwards. The
// caller decides locale resolution via `t(...)` for hardcoded entries; for
// custom kinds the hook resolves the active language's label up-front so
// the UI doesn't have to reach into per-row locale maps.

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ASSET_KINDS } from '../domain/categories';
import { subscribeCustomAssetKinds } from '../infra/repositories/firestoreSettingsRepository';

/** @typedef {import('../infra/repositories/firestoreSettingsRepository.js').CustomAssetKind} CustomAssetKind */

/**
 * @typedef {Object} KindOption
 * @property {string} value      Canonical kind id (matches the asset doc field).
 * @property {string} label      Display label in the active locale.
 * @property {boolean} custom    True for super_admin-defined kinds.
 */

/**
 * @returns {{
 *   options: KindOption[],
 *   customKinds: CustomAssetKind[],
 *   error: Error | null,
 * }}
 */
export function useCustomKinds() {
  const { t, i18n } = useTranslation('warehouse');
  const [customKinds, setCustomKinds] = useState(/** @type {CustomAssetKind[]} */ ([]));
  const [error, setError] = useState(/** @type {Error | null} */ (null));

  useEffect(() => {
    const unsub = subscribeCustomAssetKinds(
      (kinds) => {
        setCustomKinds(kinds);
        setError(null);
      },
      (err) => setError(err),
    );
    return unsub;
  }, []);

  const lang = (i18n.language || 'en').slice(0, 2);

  const options = useMemo(() => {
    /** @type {KindOption[]} */
    const out = ASSET_KINDS.map((k) => ({
      value: k,
      label: t(`kinds.${k}`, k),
      custom: false,
    }));
    for (const c of customKinds) {
      // Skip if a custom kind id collides with a hardcoded one — hardcoded wins.
      if (ASSET_KINDS.includes(/** @type any */ (c.id))) continue;
      const label =
        c.labels[/** @type {keyof typeof c.labels} */ (lang)] ||
        c.labels.en ||
        c.labels.ru ||
        c.labels.hy ||
        c.id;
      out.push({ value: c.id, label, custom: true });
    }
    return out;
  }, [t, customKinds, lang]);

  return { options, customKinds, error };
}
