import './global.css';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AppView, Gnb } from './src/components/Gnb';
import { UpdateBanner } from './src/components/UpdateBanner';
import { registerForPushNotificationsAsync } from './src/notifications/registerForPushNotifications';
import { checkForAppUpdate, UpdateInfo } from './src/utils/checkForUpdate';

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, isReady } = useAuth();
  const [view, setView] = useState<AppView>('tasks');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    // /devices가 인증을 요구하므로, 로그인된 뒤에만 푸시 토큰을 등록한다
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // APK 사이드로드 배포라 웹 미리보기(Play 스토어 없이 수동 설치하는 게 의미
    // 없는 플랫폼)에선 체크 안 함. 로그인 뒤 한 번만 확인 — 너무 자주 체크할
    // 이유가 없고, 배너라 거슬리지 않게 조용히 무시 가능함
    if (!isAuthenticated || Platform.OS === 'web') return;
    checkForAppUpdate().then((info) => {
      if (info.available) setUpdateInfo(info);
    });
  }, [isAuthenticated]);

  if (!isReady) return null; // 저장된 토큰 확인 중 (짧은 순간이라 스피너 없이 빈 화면)

  // 로그인 화면/인증된 화면 전체를 여기 한 곳에서만 SafeAreaView로 감쌈 —
  // 안전 영역(노치, 홈 인디케이터 등) 처리를 이 최상위 한 곳에서 전부
  // 끝내고, 그 안의 Gnb/LoginScreen 등은 전부 평범한 View로 둬서 안전
  // 영역을 중복으로 신경 쓸 일이 없게 함(기본 edges=전체 적용)
  return (
    <SafeAreaView className="flex-1 bg-[#f5f6f8]">
      {!isAuthenticated ? (
        <LoginScreen />
      ) : (
        <>
          {updateInfo?.available && updateInfo.latestVersion && updateInfo.releaseUrl && (
            <UpdateBanner
              latestVersion={updateInfo.latestVersion}
              releaseUrl={updateInfo.releaseUrl}
              onDismiss={() => setUpdateInfo(null)}
            />
          )}
          <Gnb activeView={view} onNavigate={setView} />
          {view === 'categories' ? (
            <CategoriesScreen />
          ) : view === 'settings' ? (
            <SettingsScreen />
          ) : (
            <TaskListScreen />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <StatusBar style="auto" />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
