import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: number;
  email: string;
}

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

const ACCESS_KEY = 'work-check-access-token';
const REFRESH_KEY = 'work-check-refresh-token';
const USER_KEY = 'work-check-user';
const EMPTY_STATE: TokenState = { accessToken: null, refreshToken: null, user: null };

let state: TokenState = EMPTY_STATE;
const listeners = new Set<(state: TokenState) => void>();

async function load(): Promise<void> {
  try {
    const [accessToken, refreshToken, userRaw] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    state = {
      accessToken,
      refreshToken,
      user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    };
  } catch {
    // SecureStore 접근 실패 — 로그아웃 상태로 시작
    state = EMPTY_STATE;
  }
  listeners.forEach((listener) => listener(state));
}

// 모듈 로드 시 한 번만 시작, AuthProvider가 이 Promise를 기다렸다가 초기 상태를 반영함
const loadPromise = load();

async function persist(): Promise<void> {
  if (state.accessToken && state.refreshToken && state.user) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, state.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, state.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(state.user)),
    ]);
  } else {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }
  listeners.forEach((listener) => listener(state));
}

export const tokenStore = {
  /** SecureStore에서 저장된 토큰을 불러오는 초기 로딩이 끝날 때까지 기다림 */
  ready: () => loadPromise,
  getState: () => state,
  getAccessToken: () => state.accessToken,
  getRefreshToken: () => state.refreshToken,
  async setTokens(accessToken: string, refreshToken: string, user: AuthUser) {
    state = { accessToken, refreshToken, user };
    await persist();
  },
  async clear() {
    state = EMPTY_STATE;
    await persist();
  },
  subscribe(listener: (state: TokenState) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
