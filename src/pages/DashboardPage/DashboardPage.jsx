import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { StatCard } from '../../components/features/Dashboard/StatCard';
import { RecentActivity } from '../../components/features/Dashboard/RecentActivity';
import { BranchesOverview } from '../../components/features/Dashboard/BranchesOverview';
import { PageHeader } from '../../components/common/PageHeader';
import './DashboardPage.css';

/**
 * Super-admin dashboard. Route: /dashboard (guarded by <RequireRole role="super_admin"/>).
 * Layout: page header, 5 stat cards, two-column grid of RecentActivity and
 * BranchesOverview.
 */
export function DashboardPage() {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const stats = useDashboardStats();
  const name = profile?.displayName || user?.email || t('common.guest');

  return (
    <div className="dashboard-page">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.welcome', { name })}
      />

      <section className="dashboard-page__stats" aria-label={t('dashboard.title')}>
        <StatCard
          label={t('dashboard.stats.totalAssets')}
          value={stats.totalAssets}
          icon="inventory"
        />
        <StatCard
          label={t('dashboard.stats.pendingTransfers')}
          value={stats.pendingTransfers}
          icon="transfers"
        />
        <StatCard
          label={t('dashboard.stats.users')}
          value={stats.users}
          icon="users"
        />
        <StatCard
          label={t('dashboard.stats.branches')}
          value={stats.branches}
          icon="structure"
        />
        <StatCard
          label={t('dashboard.stats.expiredLicenses')}
          value={stats.expiredLicenses}
          icon="licenses"
          tone="warning"
        />
      </section>

      <section className="dashboard-page__grid">
        <RecentActivity />
        <BranchesOverview />
      </section>
    </div>
  );
}
