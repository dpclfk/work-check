import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';

interface Credentials {
  email: string;
  password: string;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: Credentials) => authApi.login(email, password),
    // 로그인 성공 시 이전 세션(다른 유저였을 수도 있음)의 캐시를 전부 비워서,
    // tasks/profile 같은 쿼리가 전부 새 유저 기준으로 다시 조회되게 함
    onSuccess: () => queryClient.clear(),
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: Credentials) => {
      await authApi.register(email, password);
      return authApi.login(email, password); // 가입 후 바로 로그인
    },
    onSuccess: () => queryClient.clear(),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => queryClient.clear(),
  });
}
