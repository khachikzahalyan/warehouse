import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import './AdminLayout.css';

/**
 * Authenticated app chrome: sidebar on the left, topbar on top, children
 * routed into the main pane via react-router's <Outlet/>.
 */
export function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-layout__main">
        <TopBar />
        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
