import './global.css';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AppView, Gnb } from './src/components/Gnb';
import { registerForPushNotificationsAsync } from './src/notifications/registerForPushNotifications';

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, isReady } = useAuth();
  const [view, setView] = useState<AppView>('tasks');

  useEffect(() => {
    // /devices가 인증을 요구하므로, 로그인된 뒤에만 푸시 토큰을 등록한다
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  if (!isReady) return null; // 저장된 토큰 확인 중 (짧은 순간이라 스피너 없이 빈 화면)
  if (!isAuthenticated) return <LoginScreen />;

  return (
    <View className="flex-1 bg-[#f5f6f8]">
      <Gnb activeView={view} onNavigate={setView} />
      {view === 'categories' ? (
        <CategoriesScreen />
      ) : view === 'settings' ? (
        <SettingsScreen />
      ) : (
        <TaskListScreen />
      )}
    </View>
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
