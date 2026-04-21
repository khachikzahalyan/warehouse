import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchesOverview } from '../../../hooks/useBranchesOverview';
import { Card } from '../../common/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../common/Table';
import './BranchesOverview.css';

export function BranchesOverview() {
  const { t } = useTranslation();
  const { rows, loading } = useBranchesOverview();

  return (
    <Card as="section" padding="md" className="branches-overview">
      <header className="branches-overview__header">
        <h2 className="branches-overview__title">
          {t('dashboard.branchesOverview.title')}
        </h2>
      </header>

      {loading ? (
        <div className="branches-overview__empty">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="branches-overview__empty">
          {t('dashboard.branchesOverview.empty')}
        </div>
      ) : (
        <Table>
          <Thead sticky={false}>
            <Tr>
              <Th>{t('dashboard.branchesOverview.colBranch')}</Th>
              <Th align="right">{t('dashboard.branchesOverview.colAssets')}</Th>
              <Th align="right">{t('dashboard.branchesOverview.colEmployees')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>{row.name}</Td>
                <Td align="right">{row.assetCount}</Td>
                <Td align="right">{row.employeeCount}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Card>
  );
}
