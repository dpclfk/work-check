import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { registerForPushNotificationsAsync } from './src/notifications/registerForPushNotifications';

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <>
      <TaskListScreen />
      <StatusBar style="auto" />
    </>
  );
}
