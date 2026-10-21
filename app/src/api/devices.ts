import { apiClient } from './client';

/** 서버의 devices 테이블에 이 기기의 Expo 푸시 토큰을 등록 (기본으로 알림 켜서 등록) */
export function registerDevice(deviceToken: string, platform: string) {
  return apiClient
    .post('/devices', { deviceToken, platform, deviceAlarm: true })
    .then((res) => res.data);
}

/** 이 기기의 디바이스 토큰을 서버에서 삭제 ("이 기기 알림 받지 않기") —
 * 토큰 값 자체(ExponentPushToken[...])가 그대로 path param이라 인코딩 필요 */
export function removeDevice(deviceToken: string) {
  return apiClient.delete(`/devices/${encodeURIComponent(deviceToken)}`).then((res) => res.data);
}
