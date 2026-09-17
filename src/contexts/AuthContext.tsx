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
  const [user, setUser] = useState<AuthUser | null>(() => authService.getStoredUser());

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
