import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Input, FormField } from '../common/Input';
import { Button } from '../common/Button';
import { Stack } from '../common/Stack';
import './LoginForm.css';

/**
 * Map Firebase Auth error codes to an i18n key under `auth.errors.*`.
 * Kept intentionally non-specific for credential errors — we do not leak
 * which of (email, password) is wrong.
 * @param {unknown} err
 * @returns {string}
 */
function errorKeyFor(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'auth.errors.invalidEmail';
    case 'auth/user-disabled':
      return 'auth.errors.userDisabled';
    case 'auth/too-many-requests':
      return 'auth.errors.tooManyRequests';
    case 'auth/network-request-failed':
      return 'auth.errors.networkError';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'auth.errors.invalidCredential';
    default:
      return 'auth.errors.generic';
  }
}

export function LoginForm() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrorKey('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // On success AuthContext updates and the router redirects us away.
    } catch (err) {
      setErrorKey(errorKeyFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={onSubmit} noValidate>
      <h1 className="login-form__title">{t('auth.loginTitle')}</h1>

      <Stack gap={4}>
        <FormField label={t('auth.emailLabel')} required>
          <Input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label={t('auth.passwordLabel')} required>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        {errorKey && (
          <div className="login-form__error" role="alert">
            {t(errorKey)}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          loading={submitting}
          disabled={!email || !password}
        >
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </Stack>
    </form>
  );
}
