import { apiClient } from './client';

/** 서버의 devices 테이블에 이 기기의 Expo 푸시 토큰을 등록 (기본으로 알림 켜서 등록) */
export function registerDevice(deviceToken: string, platform: string) {
  return apiClient
    .post('/devices', { deviceToken, platform, deviceAlarm: true })
    .then((res) => res.data);
}
