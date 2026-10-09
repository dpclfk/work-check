import { apiClient, rawApiClient } from './client';
import { tokenStore, AuthUser } from '../auth/tokenStore';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface UserProfile {
  id: number;
  email: string;
  discordRoom: string | null;
  discordAlarm: boolean;
  timezone: string;
}

export interface UpdateProfileInput {
  discordRoom?: string | null;
  discordAlarm?: boolean;
  timezone?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 로그아웃 서버 무효화 전용 재시도 — 5xx/네트워크 에러처럼 "다시 하면 될 수도
 * 있는" 실패만 최대 retries번 재시도. 4xx(이미 로그아웃된 토큰 등)는 다시
 * 시도해도 결과가 똑같으니 즉시 포기.
 */
async function postWithRetry(path: string, data: unknown, retries = 2): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await rawApiClient.post(path, data);
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status && status < 500) return; // 4xx는 재시도 무의미
      if (attempt === retries) return; // 재시도 다 써도 실패하면 포기 (로컬 로그아웃은 이미 끝났음)
      await sleep(300 * (attempt + 1));
    }
  }
}

export const authApi = {
  register: (email: string, password: string) =>
    rawApiClient.post('/auth/register', { email, password }).then((res) => res.data),

  login: async (email: string, password: string) => {
    const { data } = await rawApiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
      clientType: 'web',
    });
    tokenStore.setTokens(data.accessToken, data.refreshToken, data.user);
    return data.user;
  },

  logout: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    tokenStore.clear();
    if (refreshToken) {
      await postWithRetry('/auth/logout', { refreshToken });
    }
  },

  getMe: () => apiClient.get<UserProfile>('/auth/me').then((res) => res.data),

  updateMe: (input: UpdateProfileInput) =>
    apiClient.patch<UserProfile>('/auth/me', input).then((res) => res.data),
};
