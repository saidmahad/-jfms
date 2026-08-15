import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api, { TOKEN_KEY, type ApiEnvelope } from '../lib/api.ts';
import { configureFormatters } from '../lib/format.ts';
import type { AuthUser, LoginResponse } from '../types/index.ts';

interface SettingsInfo {
  stationName: string;
  stationAddress: string;
  stationPhone: string;
  stationEmail: string;
  currency: string;
  timezone: string;
  receiptFooter: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  settings: SettingsInfo;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const EMPTY_SETTINGS: SettingsInfo = {
  stationName: 'JUPA Fuel Station',
  stationAddress: '',
  stationPhone: '',
  stationEmail: '',
  currency: 'USD',
  timezone: 'UTC',
  receiptFooter: 'Thank you for choosing JUPA.',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<SettingsInfo>(EMPTY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const applySettings = useCallback((s: SettingsInfo) => {
    setSettings(s);
    configureFormatters(s.currency, s.timezone);
  }, []);

  // Restore session on first load.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<ApiEnvelope<{ user: AuthUser; settings: SettingsInfo }>>('/auth/me')
      .then((res) => {
        setUser(res.data.data.user);
        applySettings(res.data.data.settings);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsLoading(false));
  }, [applySettings]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', { username, password });
      const data = res.data.data;
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      applySettings({
        stationName: data.settings.stationName,
        stationAddress: EMPTY_SETTINGS.stationAddress,
        stationPhone: EMPTY_SETTINGS.stationPhone,
        stationEmail: EMPTY_SETTINGS.stationEmail,
        currency: data.settings.currency,
        timezone: data.settings.timezone,
        receiptFooter: EMPTY_SETTINGS.receiptFooter,
      });
    },
    [applySettings],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the server call fails, clear the local session.
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await api.get<ApiEnvelope<{ user: AuthUser; settings: SettingsInfo }>>('/auth/me');
      setUser(res.data.data.user);
      applySettings(res.data.data.settings);
    } catch {
      // Session may have expired; the interceptor handles redirects.
    }
  }, [applySettings]);

  const value = useMemo(
    () => ({ user, settings, isLoading, login, logout, refreshSession }),
    [user, settings, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
