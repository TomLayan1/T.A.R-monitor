import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeStore } from '../services/storage';
import { authenticate, clearSession, getSessionUser, saveSession } from '../services/userService';
import type { SessionUser } from '../types/user';

export interface AuthContextValue {
  user: SessionUser | null;
  /** Unified sign-in for every account type. The role is read from the stored account, never chosen by the browser. */
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser());

  // Re-resolve the user from the authoritative users collection whenever shared data changes.
  useEffect(
    () =>
      subscribeStore(() =>
        setUser((prev) => {
          const next = getSessionUser();
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        }),
      ),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const session = await authenticate(email, password);
    saveSession(session);
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
