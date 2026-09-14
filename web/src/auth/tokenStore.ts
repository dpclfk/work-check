export interface AuthUser {
  id: number;
  email: string;
}

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

const STORAGE_KEY = 'work-check-auth';
const EMPTY_STATE: TokenState = { accessToken: null, refreshToken: null, user: null };

function readFromStorage(): TokenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : EMPTY_STATE;
  } catch {
    // localStorage 접근 불가(시크릿 모드 등)하거나 저장된 값이 깨진 경우 — 로그아웃 상태로 시작
    return EMPTY_STATE;
  }
}

let state: TokenState = readFromStorage();
const listeners = new Set<(state: TokenState) => void>();

function persist() {
  try {
    if (state.accessToken && state.refreshToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // 저장은 실패해도 메모리 상 상태는 유지 — 새로고침하면 로그아웃되는 정도로 저하
  }
  listeners.forEach((listener) => listener(state));
}

export const tokenStore = {
  getState: () => state,
  getAccessToken: () => state.accessToken,
  getRefreshToken: () => state.refreshToken,
  setTokens(accessToken: string, refreshToken: string, user: AuthUser) {
    state = { accessToken, refreshToken, user };
    persist();
  },
  clear() {
    state = EMPTY_STATE;
    persist();
  },
  subscribe(listener: (state: TokenState) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
