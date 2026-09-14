import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { registerForPushNotificationsAsync } from './src/notifications/registerForPushNotifications';

function AppContent() {
  const { isAuthenticated, isReady } = useAuth();
  const [view, setView] = useState<'tasks' | 'settings'>('tasks');

  useEffect(() => {
    // /devices가 인증을 요구하므로, 로그인된 뒤에만 푸시 토큰을 등록한다
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  if (!isReady) return null; // 저장된 토큰 확인 중 (짧은 순간이라 스피너 없이 빈 화면)
  if (!isAuthenticated) return <LoginScreen />;

  return view === 'settings' ? (
    <SettingsScreen onBack={() => setView('tasks')} />
  ) : (
    <TaskListScreen onOpenSettings={() => setView('settings')} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
