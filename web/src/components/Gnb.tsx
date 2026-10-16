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
    <header className="sticky top-0 z-10 bg-white py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {/* 흰 배경(이 header)은 뷰포트 전체 너비 유지, 안의 내용물만 .page와
          같은 비율(70%/1280px)로 맞춰서 75%/상응하는 max-width로 중앙 정렬.
          620px 이하에서는 95%로 전환 */}
      <div className="mx-auto box-border flex w-[75%] min-w-[calc(320px*95/90)] max-w-[calc(1280px*75/70)] flex-wrap items-center justify-between gap-3 px-4 max-[620px]:w-[95%]">
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-semibold no-underline hover:bg-gray-100 ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{user?.email}</span>
          <button
            type="button"
            className="border border-gray-300 bg-transparent px-2 py-1 text-sm"
            onClick={logout}
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
