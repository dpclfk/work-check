import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UpdateProfileInput, authApi } from '../api/auth';

// 로그인/회원가입/로그아웃은 토큰 저장(tokenStore) 부수효과가 얽혀 있어서
// AuthContext에 그대로 두고, 설정 화면의 단순 조회/수정(GET·PATCH /auth/me)만
// React Query로 옮김 (web과 동일한 패턴)
export const profileQueryKey = ['profile'] as const;

export function useProfileQuery() {
  return useQuery({ queryKey: profileQueryKey, queryFn: authApi.getMe });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => authApi.updateMe(input),
    // 응답 자체가 최신 프로필이라 invalidate 대신 캐시에 바로 반영
    onSuccess: (data) => queryClient.setQueryData(profileQueryKey, data),
  });
}
