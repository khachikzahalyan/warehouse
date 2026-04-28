import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../common/Input';

/**
 * Text input with an inline uniqueness indicator (⏳ / ✓ / ✗) rendered via
 * the kit Input's `suffix` slot. When the status is `conflict` and a
 * conflictName is provided, a small error row is rendered below.
 *
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   status: 'idle' | 'checking' | 'unique' | 'conflict' | 'error',
 *   conflictName?: string | null,
 *   conflictId?: string | null,
 *   label?: string,
 *   placeholder?: string,
 *   id?: string,
 * }} props
 */
export function UniquenessHintedInput({
  value,
  onChange,
  status,
  conflictName,
  conflictId,
  label,
  placeholder,
  id,
}) {
  const { t } = useTranslation('warehouse');

  let hint = null;
  // aria-label values use stable semantic tokens (language-independent) so AT
  // and tests can query them predictably. title (tooltip) is translated for
  // sighted users who hover.
  if (status === 'checking') hint = <span aria-label="checking" title={t('addAsset.unique.checking', 'Checking…')}>⏳</span>;
  if (status === 'unique') hint = <span aria-label="free" title={t('addAsset.unique.free', 'Available')}>✓</span>;
  if (status === 'conflict') hint = <span aria-label="conflict" title="Already exists">✗</span>;
  if (status === 'error') hint = <span aria-label="error" title="Check failed">!</span>;

  return (
    <div className="uniqueness-hinted">
      <Input
        id={id}
        aria-label={id ? undefined : label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        suffix={hint}
        invalid={status === 'conflict'}
      />
      {status === 'conflict' && conflictName && (
        <div className="uniqueness-hinted__conflict" role="alert">
          {conflictId ? (
            <a
              href={`/warehouse/${conflictId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="uniqueness-hinted__link"
            >
              {t('addAsset.unique.openExisting', 'Already exists: {{name}} — open', { name: conflictName })}
            </a>
          ) : (
            t('addAsset.unique.taken', 'Already exists: {{name}}', { name: conflictName })
          )}
        </div>
      )}
    </div>
  );
}
