import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { Spinner } from '../../components/common/Spinner';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import {
  WarehouseTable,
  WarehouseEmptyState,
  WarehouseAddButton,
  AssetDetailsDrawer,
  DeleteAssetModal,
  TransferAssetDrawer,
} from '../../components/features/Warehouse';
import { QuickAddDrawer, EditAssetDrawer } from '../../components/features/AssetForm';
import { useUndoableCreate } from '../../components/features/AssetForm/UndoToast';
import { useAuth } from '../../hooks/useAuth';
import { useStorageAssets } from '../../hooks/useStorageAssets';
import { createAssetRepository } from '../../infra/repositories/firestoreAssetRepository';
import { ASSET_KINDS, kindFromCategory } from '../../domain/categories';
import './WarehousePage.css';

const CATEGORY_KEYS = [
  'laptop',
  'desktop',
  'monitor',
  'peripheral',
  'phone',
  'tablet',
  'furniture',
  'vehicle',
  'other',
];

/**
 * Resolve an asset's kind for display & filtering. Prefer the explicit
 * `kind` field; fall back to the legacy `category` mapping; finally fall
 * back to 'other'. Keeps the UI working for legacy docs that haven't been
 * migrated yet.
 *
 * @param {{ kind?: string, category?: string } & Record<string, unknown>} asset
 * @returns {'device' | 'furniture' | 'accessory' | 'other'}
 */
function resolveAssetKind(asset) {
  if (asset.kind && ASSET_KINDS.includes(/** @type any */ (asset.kind))) {
    return /** @type any */ (asset.kind);
  }
  return kindFromCategory(asset.category) || 'other';
}

/**
 * Main warehouse page. Shows a table of storage assets for staff, or an
 * empty state with a CTA for new warehouses. The "N" hotkey opens the
 * QuickAddDrawer for staff users.
 */
export function WarehousePage() {
  const { t } = useTranslation('warehouse');
  const { user, role } = useAuth();

  const isStaff = role === 'admin' || role === 'super_admin';

  const repo = useMemo(
    () => createAssetRepository({ uid: user?.uid }),
    [user?.uid],
  );

  const { assets, loading: assetsLoading } = useStorageAssets(repo);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState(/** @type {string|null} */ (null));
  const [detailsAsset, setDetailsAsset] = useState(/** @type {object|null} */ (null));
  const [editAsset, setEditAsset] = useState(/** @type {object|null} */ (null));
  const [deleteAsset, setDeleteAsset] = useState(/** @type {object|null} */ (null));
  const [transferAsset, setTransferAsset] = useState(/** @type {object|null} */ (null));

  const categories = useMemo(
    () => CATEGORY_KEYS.map((id) => ({ id, label: t(`categories.${id}`, id) })),
    [t],
  );

  const categoryLabelById = useMemo(() => {
    const map = {};
    for (const c of categories) map[c.id] = c.label;
    return map;
  }, [categories]);

  const kindLabelById = useMemo(() => {
    const map = /** @type {Record<string,string>} */ ({});
    for (const k of ASSET_KINDS) map[k] = t(`kinds.${k}`, k);
    return map;
  }, [t]);

  // "N" hotkey — opens the drawer for staff when focus is not inside a form field.
  useEffect(() => {
    function onKey(e) {
      if (!isStaff) return;
      if (e.key !== 'n' && e.key !== 'N') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setDrawerOpen(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isStaff]);

  const { notifySuccess, toastNode } = useUndoableCreate({
    createdLabel: t('addAsset.created', 'Asset created'),
    undoLabel: t('addAsset.undo', 'Undo'),
  });

  const columns = [
    { key: 'name', label: t('table.name', 'Name') },
    { key: 'kind', label: t('table.kind', 'Kind') },
    { key: 'category', label: t('table.category', 'Type') },
    { key: 'sku', label: t('table.code', 'Code') },
    { key: 'model', label: t('table.model', 'Model') },
    { key: 'quantity', label: t('table.quantity', 'Qty') },
  ];

  // Pre-decorate each asset with a stable `kind` and a localized type
  // label so the table renderer can stay generic. We do not mutate the
  // original objects.
  const decoratedAssets = useMemo(() => {
    return assets.map((a) => {
      const kind = resolveAssetKind(a);
      const kindLabel = kindLabelById[kind] || kind;
      // The table renders columns by key, so we overwrite `kind` with the
      // localized label. We also keep a stable `_kind` id for filtering.
      return {
        ...a,
        _kind: kind,
        kind: kindLabel,
        kindLabel,
        categoryLabel: categoryLabelById[a.category] || a.category || '',
      };
    });
  }, [assets, kindLabelById, categoryLabelById]);

  const filteredAssets = useMemo(() => {
    let list = decoratedAssets;
    if (kindFilter) {
      list = list.filter((a) => a._kind === kindFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
      const fields = [a.name, a.sku, a.model, a.category, a.categoryLabel, a.kindLabel];
      return fields.some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [decoratedAssets, kindFilter, search]);

  // Counts used by the chip group; reflect the full asset list so the
  // chip total stays stable as the search filter narrows things down.
  const kindCounts = useMemo(() => {
    const counts = /** @type {Record<string,number>} */ ({ all: decoratedAssets.length });
    for (const k of ASSET_KINDS) counts[k] = 0;
    for (const a of decoratedAssets) {
      counts[a._kind] = (counts[a._kind] || 0) + 1;
    }
    return counts;
  }, [decoratedAssets]);

  function handleCreated(id) {
    const undoFn = async () => {};
    notifySuccess({ id }, undoFn);
  }

  return (
    <div className="warehouse-page">
      <PageHeader
        title={t('title', 'Warehouse')}
        actions={
          <WarehouseAddButton
            canAdd={isStaff}
            onClick={() => setDrawerOpen(true)}
            label={t('addAsset.button', '+ Add asset')}
          />
        }
      />

      {assetsLoading ? (
        <div className="warehouse-page__loading" aria-live="polite">
          <Spinner />
        </div>
      ) : assets.length === 0 ? (
        <WarehouseEmptyState
          canAdd={isStaff}
          onAdd={() => setDrawerOpen(true)}
          title={t('empty.title', 'Warehouse is empty')}
          description={t('empty.description', 'No items are stored at any branch yet.')}
          addLabel={t('empty.addFirst', 'Add the first item')}
        />
      ) : (
        <>
          <div className="warehouse-page__toolbar">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search.placeholder', 'Search by name, code, model…')}
              aria-label={t('search.placeholder', 'Search by name, code, model…')}
            />
          </div>
          <div
            className="warehouse-page__chips"
            role="tablist"
            aria-label={t('filter.kindAriaLabel', 'Filter by kind')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={kindFilter === null}
              className={
                'warehouse-page__chip' +
                (kindFilter === null ? ' is-active' : '')
              }
              onClick={() => setKindFilter(null)}
            >
              <span>{t('filter.all', 'All')}</span>
              <Badge>{kindCounts.all}</Badge>
            </button>
            {ASSET_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kindFilter === k}
                className={
                  'warehouse-page__chip' +
                  (kindFilter === k ? ' is-active' : '')
                }
                onClick={() => setKindFilter(k)}
              >
                <span>{kindLabelById[k]}</span>
                <Badge>{kindCounts[k] || 0}</Badge>
              </button>
            ))}
          </div>
          <WarehouseTable
            assets={filteredAssets}
            columns={columns}
            onDetails={setDetailsAsset}
            onEdit={isStaff ? setEditAsset : undefined}
            onDelete={isStaff ? setDeleteAsset : undefined}
            onTransfer={isStaff ? setTransferAsset : undefined}
            actionLabels={{
              details: t('actions.details', 'Details'),
              edit: t('actions.edit', 'Edit'),
              delete: t('actions.delete', 'Delete'),
              transfer: t('actions.transfer', 'Transfer'),
            }}
          />
        </>
      )}

      <QuickAddDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        repo={repo}
        categories={categories}
        defaultBranchId={null}
        defaultHolderDisplayName={t('storage.label', 'Storage')}
        existingNames={assets.map((a) => a.name).filter(Boolean)}
        onCreated={handleCreated}
        sourceLanguage="en"
      />

      <AssetDetailsDrawer
        open={Boolean(detailsAsset)}
        onClose={() => setDetailsAsset(null)}
        asset={detailsAsset}
        categoryLabelById={categoryLabelById}
      />

      <EditAssetDrawer
        open={Boolean(editAsset)}
        onClose={() => setEditAsset(null)}
        asset={editAsset}
        repo={repo}
        categories={categories}
      />

      <DeleteAssetModal
        open={Boolean(deleteAsset)}
        onClose={() => setDeleteAsset(null)}
        asset={deleteAsset}
        onConfirm={async () => {
          if (!deleteAsset) return;
          await repo.archive(deleteAsset.id);
          setDeleteAsset(null);
        }}
      />

      <TransferAssetDrawer
        open={Boolean(transferAsset)}
        onClose={() => setTransferAsset(null)}
        asset={transferAsset}
        repo={repo}
      />

      {toastNode}
    </div>
  );
}
