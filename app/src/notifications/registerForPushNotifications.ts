import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerDevice, removeDevice } from '../api/devices';
import { pushTokenStore } from './pushTokenStore';

// 포그라운드에서 알림을 받았을 때 배너/목록에 표시 (Expo SDK 57 기준 API)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 알림 권한을 요청하고 Expo 푸시 토큰을 발급받아 서버에 등록한다.
 * 실패하면 null을 반환한다 (권한 거부, projectId 미설정 등).
 *
 * 주의: 원격 푸시 알림은 Expo Go에서 지원되지 않는다 (SDK 53+).
 * `npx expo run:android` / `npx expo run:ios`로 만든 development build 필요.
 *
 * @param options.force `true`면 "이 기기 알림 받지 않기"로 꺼둔 상태여도 무시하고
 * 재등록한다 — SettingsScreen에서 사용자가 직접 다시 켤 때만 씀. 기본값(false)은
 * App.tsx가 로그인 시마다 자동으로 호출하는 경로라, 사용자가 명시적으로 꺼둔 기기를
 * 앱을 재시작할 때마다 조용히 되살리지 않도록 opted-out 상태를 존중한다.
 */
export async function registerForPushNotificationsAsync(
  options: { force?: boolean } = {},
): Promise<string | null> {
  if (!options.force && (await pushTokenStore.isOptedOut())) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '할 일 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4338ca',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('알림 권한이 거부되었습니다.');
    return null;
  }

  // app.json의 extra.eas.projectId (eas init으로 채워야 함)
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      'EAS projectId가 설정되지 않았습니다. `eas init`을 실행해 app.json의 extra.eas.projectId를 채워주세요.',
    );
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerDevice(token, Platform.OS);
    await pushTokenStore.set(token);
    return token;
  } catch (error) {
    console.error('푸시 토큰 발급/등록 실패', error);
    return null;
  }
}

/** "이 기기 알림 받지 않기" — 서버에 등록된 이 기기의 디바이스 토큰을 삭제하고
 * 로컬에 저장해둔 토큰도 지운다. 저장된 토큰이 없으면(애초에 등록된 적 없는
 * 기기) 아무 일도 안 함 */
export async function unregisterPushNotificationsAsync(): Promise<void> {
  const token = await pushTokenStore.get();
  if (!token) return;
  await removeDevice(token);
  await pushTokenStore.clear();
}
