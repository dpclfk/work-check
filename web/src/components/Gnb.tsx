import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV_ITEMS = [
  { to: '/tasks', label: '할 일' },
  { to: '/categories', label: '카테고리' },
  { to: '/settings', label: '설정' },
];

/** 로그인 후 모든 화면 상단에 고정으로 떠있는 전역 네비게이션 바 */
export function Gnb() {
  const { user, logout } = useAuth();

  return (
    <header className="gnb">
      <div className="gnb-inner">
        <nav className="gnb-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `gnb-link${isActive ? ' gnb-link-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-bar">
          <span className="user-email">{user?.email}</span>
          <button type="button" className="logout-button" onClick={logout}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
