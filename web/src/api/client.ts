import axios from 'axios';
import { tokenStore } from '../auth/tokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/** 로그인/회원가입/리프레시처럼 액세스 토큰이 필요 없는 요청 전용 — 인터셉터 없음 (무한 루프 방지) */
export const rawApiClient = axios.create({ baseURL: BASE_URL });

/** 그 외 모든 API용 — 토큰 자동 첨부 + 401이면 자동으로 리프레시 후 원래 요청 재시도 */
export const apiClient = axios.create({ baseURL: BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 여러 요청이 동시에 401을 맞아도 리프레시는 딱 한 번만 — 리프레시 토큰이
// 사용할 때마다 로테이션되기 때문에, 동시에 여러 번 호출하면 뒤엣것들이 다 실패함
let refreshingPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await rawApiClient.post('/auth/refresh', { refreshToken });
    const user = tokenStore.getState().user;
    if (user) tokenStore.setTokens(data.accessToken, data.refreshToken, user);
    return data.accessToken as string;
  } catch {
    tokenStore.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = refreshAccessToken().finally(() => {
          refreshingPromise = null;
        });
      }

      const newToken = await refreshingPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
