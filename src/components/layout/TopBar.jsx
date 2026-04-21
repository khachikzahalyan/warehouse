import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { APP_LOCALES } from '../../domain/locales';
import { I18N_STORAGE_KEY } from '../../i18n';
import { Select } from '../common/Select';
import { Menu } from '../common/Menu';
import { Avatar } from '../common/Avatar';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
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

  const roleLabel = useRoleLabel(profile?.role);
  const name = profile?.displayName || user?.email || t('common.guest');

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
        <Link
          to="/"
          className="topbar__home"
          aria-label={t('nav.home', { defaultValue: 'Home' })}
        >
          <Icon name="dashboard" size="md" />
        </Link>
      </div>
      <div className="topbar__right">
        <div className="topbar__lang">
          <Select
            size="sm"
            fullWidth={false}
            value={APP_LOCALES.includes(current) ? current : 'hy'}
            onChange={onChangeLang}
            aria-label={t('common.language', { defaultValue: 'Language' })}
            iconLeft={<Icon name="globe" size="sm" />}
          >
            {APP_LOCALES.map((lng) => (
              <option key={lng} value={lng}>
                {t(`lang.${lng}`, { defaultValue: lng.toUpperCase() })}
              </option>
            ))}
          </Select>
        </div>

        <Menu>
          <Menu.Trigger>
            <button type="button" className="topbar__profile-btn">
              <Avatar name={name} size="sm" />
              <span className="topbar__profile-name">{name}</span>
              <Icon name="chevronDown" size="sm" />
            </button>
          </Menu.Trigger>
          <Menu.List align="right">
            <Menu.Header>
              <div className="topbar__menu-name">{name}</div>
              <div className="topbar__menu-role">
                <Badge tone="neutral" size="sm">
                  {roleLabel}
                </Badge>
              </div>
            </Menu.Header>
            <Menu.Item
              as={Link}
              to="/profile"
              iconLeft={<Icon name="user" size="sm" />}
            >
              {t('nav.profile')}
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              danger
              iconLeft={<Icon name="logout" size="sm" />}
              onSelect={onSignOut}
              disabled={signingOut}
            >
              {signingOut ? t('common.signingOut') : t('common.signOut')}
            </Menu.Item>
          </Menu.List>
        </Menu>
      </div>
    </header>
  );
}
