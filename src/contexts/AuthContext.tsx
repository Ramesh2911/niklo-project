/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { authService, type AuthUser } from '../lib/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = authService.getStoredUser();
    const hasToken = authService.isLoggedIn();
    // Incomplete session must not render as logged-in (stale Log Out menu).
    if (!stored || !hasToken) {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    }
    return stored;
  });

  const login = useCallback((u: AuthUser) => setUser(u), []);
  const updateUser = useCallback((u: AuthUser) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user && authService.isLoggedIn(), login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
