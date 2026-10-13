import { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Gnb } from './components/Gnb';
import { LoginPage } from './pages/LoginPage';
import { TaskListPage } from './pages/TaskListPage';
import { SettingsPage } from './pages/SettingsPage';
import { CategoriesPage } from './pages/CategoriesPage';

/** 로그인 안 된 상태로 보호된 경로에 들어오면 /login으로 돌려보냄 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** 이미 로그인된 상태로 /login에 들어오면 할 일 목록으로 돌려보냄 */
function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/tasks" replace />;
  return <>{children}</>;
}

/** 어느 경로에도 안 걸리면(루트 "/" 포함) 로그인 여부에 따라 적절한 곳으로 */
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/tasks' : '/login'} replace />;
}

/** 로그인 후 화면들의 공통 레이아웃 — GNB를 한 번만 두고, 나머지는 Outlet으로 교체 */
function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <Gnb />
      <Outlet />
    </RequireAuth>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
