import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../icons';
import { APP_LOCALES } from '../../domain/locales';
import { I18N_STORAGE_KEY } from '../../i18n';
import './TopBar.css';

/** Display label for a role via i18n, falling back to '—'. */
function useRoleLabel(role) {
  const { t } = useTranslation();
  if (!role) return t('common.none');
  return t(`role.${role}`);
}

export function TopBar() {
  const { user, profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const roleLabel = useRoleLabel(profile?.role);
  const name = profile?.displayName || user?.email || t('common.guest');

  // Close menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocMouseDown(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[topbar] sign-out failed:', err);
    } finally {
      setSigningOut(false);
    }
  };

  const onChangeLang = (e) => {
    const next = e.target.value;
    i18n.changeLanguage(next).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[topbar] changeLanguage failed:', err);
    });
    try {
      window.localStorage.setItem(I18N_STORAGE_KEY, next);
    } catch {
      // storage may be blocked — not fatal.
    }
  };

  const current = (i18n.resolvedLanguage || i18n.language || 'hy').slice(0, 2);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <Link to="/" className="topbar__home" aria-label={t('nav.home', { defaultValue: 'Home' })}>
          <Icon name="dashboard" size={18} />
        </Link>
      </div>
      <div className="topbar__right">
        <label className="topbar__lang" title={t('common.language', { defaultValue: 'Language' })}>
          <Icon name="globe" size={16} aria-hidden />
          <select
            value={APP_LOCALES.includes(current) ? current : 'hy'}
            onChange={onChangeLang}
            aria-label={t('common.language', { defaultValue: 'Language' })}
          >
            {APP_LOCALES.map((lng) => (
              <option key={lng} value={lng}>
                {t(`lang.${lng}`, { defaultValue: lng.toUpperCase() })}
              </option>
            ))}
          </select>
        </label>

        <div className="topbar__profile">
          <button
            type="button"
            ref={buttonRef}
            className="topbar__profile-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="user" size={18} />
            <span className="topbar__profile-name">{name}</span>
            <Icon name="chevronDown" size={14} />
          </button>
          {menuOpen && (
            <div ref={menuRef} role="menu" className="topbar__menu">
              <div className="topbar__menu-header">
                <div className="topbar__menu-name">{name}</div>
                <div className="topbar__menu-role">{roleLabel}</div>
              </div>
              <Link
                to="/profile"
                role="menuitem"
                className="topbar__menu-item"
                onClick={() => setMenuOpen(false)}
              >
                <Icon name="user" size={16} />
                <span>{t('nav.profile')}</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                className="topbar__menu-item topbar__menu-item--danger"
                onClick={onSignOut}
                disabled={signingOut}
              >
                <Icon name="logout" size={16} />
                <span>{signingOut ? t('common.signingOut') : t('common.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
