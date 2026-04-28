import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Input, FormField } from '../../common/Input';
import { addCustomAssetKind } from '../../../infra/repositories/firestoreSettingsRepository';
import './AddKindModal.css';

const ID_RE = /^[a-z][a-z0-9_]*$/;

/** @typedef {import('../../../infra/repositories/firestoreSettingsRepository.js').CustomAssetKind} CustomAssetKind */

/**
 * Super_admin-only modal for adding a new asset "kind" to
 * /settings/global_lists/assetKinds. Collects per-locale labels (en/ru/hy)
 * + a stable id + an optional starter list of types (one per line).
 *
 * The host component is responsible for permission gating — this modal
 * does not check the user role itself.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onAdded?: (kind: CustomAssetKind) => void,
 * }} props
 */
export function AddKindModal({ open, onClose, onAdded }) {
  const { t } = useTranslation('warehouse');
  const [nameEn, setNameEn] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [nameHy, setNameHy] = useState('');
  const [id, setId] = useState('');
  const [typesText, setTypesText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(/** @type {string | null} */ (null));

  // Reset on open/close so re-opening starts clean.
  useEffect(() => {
    if (!open) {
      setNameEn('');
      setNameRu('');
      setNameHy('');
      setId('');
      setTypesText('');
      setSubmitting(false);
      setErrorKey(null);
    }
  }, [open]);

  // Auto-derive id from the English name when the id field hasn't been
  // edited manually. Once the user touches `id` we leave it alone.
  const [idTouched, setIdTouched] = useState(false);
  const derivedId = useMemo(
    () =>
      (nameEn || nameRu || nameHy)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, ''),
    [nameEn, nameRu, nameHy],
  );
  useEffect(() => {
    if (!idTouched) setId(derivedId);
  }, [derivedId, idTouched]);

  function buildKind() {
    /** @type {CustomAssetKind} */
    const kind = {
      id: id.trim(),
      labels: {},
      types: typesText
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (nameEn.trim()) kind.labels.en = nameEn.trim();
    if (nameRu.trim()) kind.labels.ru = nameRu.trim();
    if (nameHy.trim()) kind.labels.hy = nameHy.trim();
    return kind;
  }

  function validate() {
    const kind = buildKind();
    if (!kind.id || Object.keys(kind.labels).length === 0) {
      return 'errorRequired';
    }
    if (!ID_RE.test(kind.id)) {
      return 'errorIdFormat';
    }
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setErrorKey(v);
      return;
    }
    setErrorKey(null);
    setSubmitting(true);
    const kind = buildKind();
    try {
      await addCustomAssetKind(kind);
      if (onAdded) onAdded(kind);
      onClose();
    } catch (e) {
      const msg = e && /** @type {Error} */ (e).message ? /** @type {Error} */ (e).message : '';
      if (/already exists/i.test(msg)) {
        setErrorKey('errorDuplicate');
      } else {
        // Surface raw message as a fallback so the user can see what went wrong.
        // eslint-disable-next-line no-console
        console.warn('[addKind] failed:', e);
        setErrorKey('errorRequired');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <div className="add-kind-modal__actions">
      <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
        {t('addKind.cancel', 'Cancel')}
      </Button>
      <Button variant="primary" type="button" onClick={submit} loading={submitting}>
        {t('addKind.save', 'Save')}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('addKind.title', 'Add new kind')}
      size="sm"
      footer={footer}
    >
      <div className="add-kind-modal__body">
        <p className="add-kind-modal__group-label">{t('addKind.nameField', 'Name (per language)')}</p>
        <FormField label={t('addKind.nameEn', 'English')}>
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoComplete="off" />
        </FormField>
        <FormField label={t('addKind.nameRu', 'Russian')}>
          <Input value={nameRu} onChange={(e) => setNameRu(e.target.value)} autoComplete="off" />
        </FormField>
        <FormField label={t('addKind.nameHy', 'Armenian')}>
          <Input value={nameHy} onChange={(e) => setNameHy(e.target.value)} autoComplete="off" />
        </FormField>

        <FormField label={t('addKind.idField', 'Id (lowercase, snake_case)')}>
          <Input
            value={id}
            onChange={(e) => {
              setIdTouched(true);
              setId(e.target.value);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>
        <p className="add-kind-modal__hint">{t('addKind.idHint', 'Used as the database value. Letters, digits, underscores only.')}</p>

        <FormField label={t('addKind.typesField', 'Initial types (one per line, optional)')}>
          <textarea
            className="add-kind-modal__textarea"
            value={typesText}
            onChange={(e) => setTypesText(e.target.value)}
            rows={4}
          />
        </FormField>
        <p className="add-kind-modal__hint">{t('addKind.typesHint', 'Free-form names — translations can be added later.')}</p>

        {errorKey && (
          <p role="alert" className="add-kind-modal__error">
            {t(`addKind.${errorKey}`, errorKey)}
          </p>
        )}
      </div>
    </Modal>
  );
}
