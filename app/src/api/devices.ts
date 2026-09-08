import { apiClient } from './client';

/** 서버의 device_tokens 테이블에 이 기기의 Expo 푸시 토큰을 등록 */
export function registerDevice(expoPushToken: string, platform: string) {
  return apiClient.post('/devices', { expoPushToken, platform }).then((res) => res.data);
}
