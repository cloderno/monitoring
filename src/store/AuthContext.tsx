import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '../types/auth';
import * as auth from '../services/authService';
import { ApiError } from '../services/apiClient';

interface AuthContextValue {
  session: Session | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => auth.loadSession());
  const token = session?.token;

  // Токен мог истечь или сервер мог перезапуститься с новым секретом
  useEffect(() => {
    if (!token) return;
    auth.fetchMe(token).catch((err) => {
      if (err instanceof ApiError && err.status === 401) {
        auth.clearSession();
        setSession(null);
      }
    });
  }, [token]);

  const login = useCallback(async (loginName: string, password: string) => {
    setSession(await auth.login(loginName, password));
  }, []);

  const logout = useCallback(() => {
    auth.clearSession();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
