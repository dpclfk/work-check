import { ReactNode } from 'react';

/** 모든 화면(할일/카테고리/설정)의 공통 레이아웃 폭 */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="box-border mx-auto w-[70%] min-w-[320px] max-w-[1280px] px-4 py-8 max-[620px]:w-[90%]">
      {children}
    </div>
  );
}
