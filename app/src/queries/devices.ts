import { useMutation } from '@tanstack/react-query';
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from '../notifications/registerForPushNotifications';

// "이 기기 알림 받기" 토글 — 서버/쿼리 캐시가 아니라 기기 로컬 상태(pushTokenStore)가
// 진실 소스라 다른 쿼리와 달리 invalidate할 대상이 없음 (SettingsScreen이 직접 state로 관리)
export function useEnableDeviceAlarmMutation() {
  return useMutation({ mutationFn: () => registerForPushNotificationsAsync({ force: true }) });
}

export function useDisableDeviceAlarmMutation() {
  return useMutation({ mutationFn: unregisterPushNotificationsAsync });
}
