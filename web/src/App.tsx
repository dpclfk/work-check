import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { TaskListPage } from './pages/TaskListPage';
import { SettingsPage } from './pages/SettingsPage';
import { CategoriesPage } from './pages/CategoriesPage';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<'tasks' | 'settings' | 'categories'>('tasks');

  if (!isAuthenticated) return <LoginPage />;

  if (view === 'settings') return <SettingsPage onBack={() => setView('tasks')} />;
  if (view === 'categories') return <CategoriesPage onBack={() => setView('tasks')} />;

  return (
    <TaskListPage
      onOpenSettings={() => setView('settings')}
      onOpenCategories={() => setView('categories')}
    />
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
