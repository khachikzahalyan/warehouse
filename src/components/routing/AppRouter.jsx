import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from '../layout/AppLayout';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { ForbiddenPage } from '../../pages/ForbiddenPage';

// Opt into v7 behaviour now to silence v6 deprecation warnings and make
// the eventual upgrade a no-op.
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

export function AppRouter() {
  return (
    <BrowserRouter future={routerFutureFlags}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
