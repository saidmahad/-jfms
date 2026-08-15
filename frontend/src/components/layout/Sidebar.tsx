import { NavLink, useNavigate } from 'react-router-dom';
import { Fuel, LogOut, Settings, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { getNavForRole } from './nav.ts';
import { cn } from '../../lib/utils.ts';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-energy-gradient text-white shadow-glow-sm">
        <Fuel className="h-5 w-5" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-sm font-extrabold tracking-wide text-white">JUPA</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-petrol-300">Fuel Station</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const sections = getNavForRole(user.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const content = (
    <div className="flex h-full flex-col bg-petroleum-gradient">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button onClick={onClose} className="rounded-lg p-1 text-petrol-300 hover:bg-white/10 lg:hidden" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-petrol-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-white/10 text-white shadow-glow-sm'
                          : 'text-petrol-300 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-energy-gradient" />
                        )}
                        <item.icon
                          className={cn('h-[18px] w-[18px] shrink-0 transition-colors', isActive ? 'text-energy-400' : 'text-petrol-400 group-hover:text-energy-400')}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-energy-gradient font-display text-sm font-bold text-white">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{user.employeeName ?? user.username}</p>
            <p className="text-[11px] capitalize text-petrol-300">{user.role.toLowerCase()}</p>
          </div>
          <div className="flex gap-1">
            <NavLink
              to="/settings"
              onClick={onClose}
              className="rounded-lg p-1.5 text-petrol-300 hover:bg-white/10 hover:text-white"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </NavLink>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-petrol-300 hover:bg-white/10 hover:text-energy-400"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-petrol-950/60 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in-right">{content}</aside>
        </div>
      )}
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{content}</aside>
    </>
  );
}
