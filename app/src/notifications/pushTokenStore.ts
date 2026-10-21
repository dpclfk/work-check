import { secureStorage } from '../utils/secureStorage';

const PUSH_TOKEN_KEY = 'work-check-push-token';
// "이 기기 알림 받지 않기"로 명시적으로 끈 적이 있는지 — 있으면 다음 앱 실행 때
// registerForPushNotificationsAsync()가 자동으로 재등록하지 않게 막는 데 씀
// (안 그러면 꺼도 앱을 재시작할 때마다 다시 켜짐)
const OPTED_OUT_KEY = 'work-check-push-opted-out';

/** registerForPushNotificationsAsync()가 발급받은 이 기기의 Expo 푸시 토큰을
 * 로컬에 저장해둠 — SettingsScreen이 "이 기기 알림 받기" 체크박스의 초기
 * 상태(토큰이 있으면 켜짐)를 보여주고, 끌 때 서버의 어떤 토큰을 지울지
 * 알아야 해서 필요 */
export const pushTokenStore = {
  get: () => secureStorage.getItemAsync(PUSH_TOKEN_KEY),
  async set(token: string) {
    await secureStorage.setItemAsync(PUSH_TOKEN_KEY, token);
    await secureStorage.deleteItemAsync(OPTED_OUT_KEY);
  },
  async clear() {
    await secureStorage.deleteItemAsync(PUSH_TOKEN_KEY);
    await secureStorage.setItemAsync(OPTED_OUT_KEY, '1');
  },
  async isOptedOut() {
    return (await secureStorage.getItemAsync(OPTED_OUT_KEY)) === '1';
  },
};
