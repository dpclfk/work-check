import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { TaskListPage } from './pages/TaskListPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<'tasks' | 'settings'>('tasks');

  if (!isAuthenticated) return <LoginPage />;

  return view === 'settings' ? (
    <SettingsPage onBack={() => setView('tasks')} />
  ) : (
    <TaskListPage onOpenSettings={() => setView('settings')} />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
