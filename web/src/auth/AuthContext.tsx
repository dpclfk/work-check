import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { tokenStore, AuthUser } from './tokenStore';
import { useLoginMutation, useLogoutMutation, useRegisterMutation } from '../queries/auth';

interface Credentials {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<AuthUser, Error, Credentials>;
  registerMutation: UseMutationResult<AuthUser, Error, Credentials>;
  logoutMutation: UseMutationResult<void, Error, void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(tokenStore.getState().user);

  // tokenStore(React 밖 순수 모듈 — axios 인터셉터와 공유)를 구독해서
  // 토큰이 바뀔 때마다(로그인/로그아웃/리프레시 실패 등) user state에 반영
  useEffect(() => tokenStore.subscribe((state) => setUser(state.user)), []);

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loginMutation, registerMutation, logoutMutation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
