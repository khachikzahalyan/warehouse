import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './LoginForm.css';

/**
 * Map Firebase Auth error codes to human-readable Russian strings.
 * Kept intentionally non-specific for credential errors — we do not leak
 * which of (email, password) is wrong.
 * @param {unknown} err
 * @returns {string}
 */
function messageFor(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Неверный формат email.';
    case 'auth/user-disabled':
      return 'Учётная запись отключена. Обратитесь к администратору.';
    case 'auth/too-many-requests':
      return 'Слишком много попыток. Подождите и попробуйте снова.';
    case 'auth/network-request-failed':
      return 'Проблема с сетью. Проверьте подключение.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Неверный email или пароль.';
    default:
      return 'Не удалось войти. Попробуйте ещё раз.';
  }
}

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // On success AuthContext updates and the router redirects us away.
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={onSubmit} noValidate>
      <h1 className="login-form__title">Вход в систему</h1>

      <label className="login-form__field">
        <span className="login-form__label">Email</span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </label>

      <label className="login-form__field">
        <span className="login-form__label">Пароль</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
      </label>

      {error && (
        <div className="login-form__error" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="login-form__submit"
        disabled={submitting || !email || !password}
      >
        {submitting ? 'Вход…' : 'Войти'}
      </button>
    </form>
  );
}
