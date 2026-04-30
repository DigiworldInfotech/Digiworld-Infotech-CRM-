import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import OverdueReminderManager from './OverdueReminderManager';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <OverdueReminderManager />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-end px-4 lg:px-8 shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
