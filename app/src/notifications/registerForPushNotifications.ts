import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerDevice } from '../api/devices';

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
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
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
    return token;
  } catch (error) {
    console.error('푸시 토큰 발급/등록 실패', error);
    return null;
  }
}
