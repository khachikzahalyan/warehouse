import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchesOverview } from '../../../hooks/useBranchesOverview';
import './BranchesOverview.css';

export function BranchesOverview() {
  const { t } = useTranslation();
  const { rows, loading } = useBranchesOverview();

  return (
    <section className="branches-overview">
      <header className="branches-overview__header">
        <h2 className="branches-overview__title">{t('dashboard.branchesOverview.title')}</h2>
      </header>

      {loading ? (
        <div className="branches-overview__empty">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="branches-overview__empty">{t('dashboard.branchesOverview.empty')}</div>
      ) : (
        <table className="branches-overview__table">
          <thead>
            <tr>
              <th scope="col">{t('dashboard.branchesOverview.colBranch')}</th>
              <th scope="col" className="branches-overview__num">
                {t('dashboard.branchesOverview.colAssets')}
              </th>
              <th scope="col" className="branches-overview__num">
                {t('dashboard.branchesOverview.colEmployees')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td className="branches-overview__num">{row.assetCount}</td>
                <td className="branches-overview__num">{row.employeeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
