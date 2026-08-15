import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronRight,
  Menu,
  Moon,
  Search,
  Sun,
  CheckCheck,
  FileText,
  ShoppingCart,
  AlertTriangle,
  LogIn,
  ShieldAlert,
  Info,
} from 'lucide-react';
import api, { errorMessage } from '../../lib/api.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useToast } from '../../contexts/ToastContext.tsx';
import { BREADCRUMB_MAP } from './nav.ts';
import type { NotificationItem, Paginated, Sale } from '../../types/index.ts';
import { cn } from '../../lib/utils.ts';
import { formatTime } from '../../lib/format.ts';

const NOTIF_ICON: Record<string, React.ReactNode> = {
  low_stock: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  critical_stock: <AlertTriangle className="h-4 w-4 text-danger" />,
  sale: <ShoppingCart className="h-4 w-4 text-success" />,
  login: <LogIn className="h-4 w-4 text-petrol-500" />,
  error: <ShieldAlert className="h-4 w-4 text-danger" />,
  admin: <Info className="h-4 w-4 text-energy-500" />,
  system: <Info className="h-4 w-4 text-slate-500" />,
};

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const crumbs = useMemo(() => {
    const parts: { to: string; label: string }[] = [];
    const path = location.pathname;
    if (path.startsWith('/sales/') && path !== '/sales/new') {
      parts.push({ to: '/sales', label: 'Sales' });
      parts.push({ to: path, label: 'Sale Details' });
    } else {
      parts.push({ to: path, label: BREADCRUMB_MAP[path] ?? 'JUPA' });
    }
    return parts;
  }, [location.pathname]);

  // Global search: sale receipts, pumps, customers
  const searchQuery = useQuery({
    queryKey: ['global-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const res = await api.get<{ data: Paginated<Sale> }>('/sales', { params: { search: searchTerm, perPage: 6 } });
      return res.data.data.items;
    },
    enabled: searchOpen && searchTerm.trim().length >= 2,
  });

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: NotificationItem[]; unreadCount: number } }>('/notifications', {
        params: { limit: 8 },
      });
      return res.data.data;
    },
    refetchInterval: 60_000,
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      notifQuery.refetch();
      toast('All notifications marked as read', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const openNotification = async (n: NotificationItem) => {
    if (!n.isRead) {
      await api.post(`/notifications/${n.id}/read`).catch(() => undefined);
      notifQuery.refetch();
    }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const unread = notifQuery.data?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-petrol-100 dark:border-petrol-800 bg-white/80 dark:bg-petrol-950/80 backdrop-blur-lg">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-petrol-500 hover:bg-petrol-100 dark:hover:bg-petrol-800 lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <nav className="hidden items-center gap-1.5 text-sm sm:flex" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.to + i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-petrol-300 dark:text-petrol-600" />}
              <span className={cn('font-medium', i === crumbs.length - 1 ? 'text-petrol-900 dark:text-white' : 'text-petrol-400')}>
                {c.label}
              </span>
            </span>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Global search */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-petrol-400" />
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search sales, pumps, fuel…"
            className="input w-56 pl-9 lg:w-72"
            aria-label="Global search"
          />
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-petrol-100 dark:border-petrol-800 bg-white dark:bg-petrol-900 shadow-xl">
              {searchTerm.trim().length < 2 ? (
                <p className="px-4 py-3 text-xs text-petrol-400">Type at least 2 characters to search</p>
              ) : searchQuery.isLoading ? (
                <p className="px-4 py-3 text-xs text-petrol-400">Searching…</p>
              ) : searchQuery.data && searchQuery.data.length > 0 ? (
                <>
                  <p className="border-b border-petrol-100 dark:border-petrol-800 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-petrol-400">
                    Sale receipts
                  </p>
                  {searchQuery.data.map((s) => (
                    <Link
                      key={s.id}
                      to={`/sales/${s.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-petrol-50 dark:hover:bg-petrol-800"
                    >
                      <FileText className="h-4 w-4 text-energy-500" />
                      <span className="flex-1 text-sm text-petrol-800 dark:text-slate-100">
                        #{s.id} · {s.pumpNumber} · {s.fuelName}
                      </span>
                      <span className="text-xs text-petrol-400">{s.litres} L</span>
                    </Link>
                  ))}
                </>
              ) : (
                <p className="px-4 py-3 text-xs text-petrol-400">No matching sales found</p>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-lg p-2 text-petrol-500 hover:bg-petrol-100 dark:hover:bg-petrol-800 dark:text-slate-300"
            aria-label={`Notifications (${unread} unread)`}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-energy-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-petrol-100 dark:border-petrol-800 bg-white dark:bg-petrol-900 shadow-xl">
              <div className="flex items-center justify-between border-b border-petrol-100 dark:border-petrol-800 px-4 py-2.5">
                <p className="text-sm font-bold text-petrol-900 dark:text-white">Notifications</p>
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-energy-600 hover:underline">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!notifQuery.data || notifQuery.data.items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-petrol-400">No notifications</p>
                ) : (
                  notifQuery.data.items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-petrol-100/60 dark:border-petrol-800/60 px-4 py-3 text-left hover:bg-petrol-50 dark:hover:bg-petrol-800',
                        !n.isRead && 'bg-energy-500/[0.04]',
                      )}
                    >
                      <span className="mt-0.5 shrink-0">{NOTIF_ICON[n.type] ?? <Info className="h-4 w-4 text-petrol-400" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-petrol-800 dark:text-slate-100">{n.title}</span>
                        <span className="block truncate text-xs text-petrol-500 dark:text-petrol-400">{n.message}</span>
                        <span className="mt-0.5 block text-[10px] text-petrol-400">{formatTime(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-energy-500" />}
                    </button>
                  ))
                )}
              </div>
              <Link
                to="/notifications"
                onClick={() => setNotifOpen(false)}
                className="block border-t border-petrol-100 dark:border-petrol-800 px-4 py-2.5 text-center text-xs font-semibold text-energy-600 hover:bg-petrol-50 dark:hover:bg-petrol-800"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-petrol-500 hover:bg-petrol-100 dark:hover:bg-petrol-800 dark:text-slate-300"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User */}
        <Link to="/profile" className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-petrol-100 dark:hover:bg-petrol-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-petroleum-gradient font-display text-sm font-bold text-white">
            {user?.username.charAt(0).toUpperCase()}
          </span>
          <span className="hidden leading-tight md:block">
            <span className="block max-w-[120px] truncate text-sm font-semibold text-petrol-900 dark:text-white">
              {user?.employeeName ?? user?.username}
            </span>
            <span className="block text-[11px] capitalize text-petrol-400">{user?.role.toLowerCase()}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
