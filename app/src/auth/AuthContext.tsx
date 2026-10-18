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
  isReady: boolean;
  loginMutation: UseMutationResult<AuthUser, Error, Credentials>;
  registerMutation: UseMutationResult<AuthUser, Error, Credentials>;
  logoutMutation: UseMutationResult<void, Error, void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    tokenStore.ready().then(() => {
      setUser(tokenStore.getState().user);
      setIsReady(true);
    });
    return tokenStore.subscribe((state) => setUser(state.user));
  }, []);

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady,
        loginMutation,
        registerMutation,
        logoutMutation,
      }}
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
