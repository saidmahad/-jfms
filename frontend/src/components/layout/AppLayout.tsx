import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in" key={location.pathname}>
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-petrol-100 dark:border-petrol-800 px-6 py-4">
          <p className="text-center text-xs text-petrol-400 dark:text-petrol-600">
            JUPA Fuel Station Management System · Smart Operations. Accurate Sales. Complete Control.
          </p>
        </footer>
      </div>
    </div>
  );
}
