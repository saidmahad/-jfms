import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext.tsx';
import type { Settings } from '../types/index.ts';

interface SettingsContextValue {
  settings: Settings | null;
  stationName: string;
  currency: string;
  timezone: string;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: null, // full settings object is fetched on demand (admin settings page)
      stationName: auth.settings.stationName,
      currency: auth.settings.currency,
      timezone: auth.settings.timezone,
    }),
    [auth.settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
