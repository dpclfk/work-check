import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { tokenStore, AuthUser } from './tokenStore';
import { authApi } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(tokenStore.getState().user);

  useEffect(() => tokenStore.subscribe((state) => setUser(state.user)), []);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
  };

  const register = async (email: string, password: string) => {
    await authApi.register(email, password);
    await authApi.login(email, password); // 가입 후 바로 로그인
  };

  const logout = async () => {
    await authApi.logout();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
