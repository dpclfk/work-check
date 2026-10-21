import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store는 OS 키체인(iOS)/Keystore(Android) 기반이라 웹에서는
// 지원이 안 됨(호출하면 예외 발생) — 웹에서는 localStorage로 대체.
// auth/tokenStore.ts와 notifications/pushTokenStore.ts가 공통으로 쓰는 저장소 추상화
export const secureStorage =
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
