import { Platform } from 'react-native';
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

// expo-secure-store는 OS 키체인(iOS)/Keystore(Android) 기반이라 웹에서는
// 지원이 안 됨(호출하면 예외 발생) — 웹에서는 localStorage로 대체.
// load()/persist()는 이 세 메서드만 쓰므로, 아래서 플랫폼별로 한 번만 분기하면
// 나머지 코드는 지금 어떤 플랫폼인지 몰라도 됨
const storage =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key: string) => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItemAsync: async (key: string, value: string) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            // 저장 실패(시크릿 모드 등)해도 메모리 상 상태는 유지
          }
        },
        deleteItemAsync: async (key: string) => {
          try {
            localStorage.removeItem(key);
          } catch {
            // 무시
          }
        },
      }
    : SecureStore;

const ACCESS_KEY = 'work-check-access-token';
const REFRESH_KEY = 'work-check-refresh-token';
const USER_KEY = 'work-check-user';
const EMPTY_STATE: TokenState = { accessToken: null, refreshToken: null, user: null };

let state: TokenState = EMPTY_STATE;
const listeners = new Set<(state: TokenState) => void>();

async function load(): Promise<void> {
  try {
    const [accessToken, refreshToken, userRaw] = await Promise.all([
      storage.getItemAsync(ACCESS_KEY),
      storage.getItemAsync(REFRESH_KEY),
      storage.getItemAsync(USER_KEY),
    ]);
    state = {
      accessToken,
      refreshToken,
      user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    };
  } catch {
    // 저장소 접근 실패 — 로그아웃 상태로 시작
    state = EMPTY_STATE;
  }
  listeners.forEach((listener) => listener(state));
}

// 모듈 로드 시 한 번만 시작, AuthProvider가 이 Promise를 기다렸다가 초기 상태를 반영함
const loadPromise = load();

async function persist(): Promise<void> {
  if (state.accessToken && state.refreshToken && state.user) {
    await Promise.all([
      storage.setItemAsync(ACCESS_KEY, state.accessToken),
      storage.setItemAsync(REFRESH_KEY, state.refreshToken),
      storage.setItemAsync(USER_KEY, JSON.stringify(state.user)),
    ]);
  } else {
    await Promise.all([
      storage.deleteItemAsync(ACCESS_KEY),
      storage.deleteItemAsync(REFRESH_KEY),
      storage.deleteItemAsync(USER_KEY),
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
