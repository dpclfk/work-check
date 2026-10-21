import { FormEvent, useState } from 'react';
import { MainCategory, SubCategory } from '../api/categories';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageContainer } from '../components/PageContainer';
import {
  useCreateMainCategoryMutation,
  useCreateSubCategoryMutation,
  useMainCategoriesQuery,
  useRemoveMainCategoryMutation,
  useRemoveSubCategoryMutation,
  useRenameMainCategoryMutation,
  useSubCategoriesQuery,
  useUpdateSubCategoryMutation,
} from '../queries/categories';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

const fieldClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
// 추가/수정은 앱의 "추가" 버튼과 같은 색, 저장은 완료 버튼과 같은 색(emerald),
// 삭제·취소는 빨간색 — 켜기/끄기 같은 중립 버튼은 카테고리 화면엔 없음
const primaryButtonClass =
  'whitespace-nowrap rounded-lg bg-indigo-700 px-3 py-1.5 text-sm text-white hover:cursor-pointer hover:bg-indigo-800';
const saveButtonClass =
  'whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:cursor-pointer hover:bg-emerald-700';
const deleteButtonClass =
  'whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:cursor-pointer hover:bg-red-700';

export function CategoriesPage() {
  const { data: mainCategories = [], isLoading: mainsLoading } = useMainCategoriesQuery();
  const { data: subCategories = [], isLoading: subsLoading } = useSubCategoriesQuery();
  const loading = mainsLoading || subsLoading;

  const createMainMutation = useCreateMainCategoryMutation();
  const renameMainMutation = useRenameMainCategoryMutation();
  const removeMainMutation = useRemoveMainCategoryMutation();
  const createSubMutation = useCreateSubCategoryMutation();
  const updateSubMutation = useUpdateSubCategoryMutation();
  const removeSubMutation = useRemoveSubCategoryMutation();

  const [newMainName, setNewMainName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubMainId, setNewSubMainId] = useState<string>('');

  const [editingMainId, setEditingMainId] = useState<number | null>(null);
  const [editingMainName, setEditingMainName] = useState('');
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [editingSubMainId, setEditingSubMainId] = useState<string>('');
  // 접힌 메인카테고리 그룹의 key 모음(할 일 목록의 접기와 동일한 패턴) — 기본은 전부 펼침
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // 삭제 확인 대기 중인 카테고리 — window.confirm(취소/확인 2분기)으로는
  // "분리"/"함께삭제" 3지선다를 못 나타내서 ConfirmDialog로 대체(앱의
  // Alert.alert 3버튼과 동일한 UX)
  const [pendingDelete, setPendingDelete] = useState<
    { type: 'main'; category: MainCategory } | { type: 'sub'; category: SubCategory } | null
  >(null);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 지금 활성화된 mutation 중 가장 최근 에러 하나만 보여줌(지금까지의 단일 에러 메시지 UX 유지)
  const error = [
    createMainMutation,
    renameMainMutation,
    removeMainMutation,
    createSubMutation,
    updateSubMutation,
    removeSubMutation,
  ].find((m) => m.isError)?.error;

  const handleCreateMain = (e: FormEvent) => {
    e.preventDefault();
    if (!newMainName.trim()) return;
    createMainMutation.mutate(newMainName.trim(), { onSuccess: () => setNewMainName('') });
  };

  const handleCreateSub = (e: FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    createSubMutation.mutate(
      { name: newSubName.trim(), mainCategoryId: newSubMainId === '' ? null : Number(newSubMainId) },
      {
        onSuccess: () => {
          setNewSubName('');
          setNewSubMainId('');
        },
      },
    );
  };

  const startEditMain = (category: MainCategory) => {
    setEditingMainId(category.id);
    setEditingMainName(category.name);
  };

  const saveEditMain = (id: number) => {
    if (!editingMainName.trim()) return;
    renameMainMutation.mutate(
      { id, name: editingMainName.trim() },
      { onSuccess: () => setEditingMainId(null) },
    );
  };

  const handleRemoveMain = (category: MainCategory) => setPendingDelete({ type: 'main', category });

  const startEditSub = (category: SubCategory) => {
    setEditingSubId(category.id);
    setEditingSubName(category.name);
    setEditingSubMainId(category.mainCategoryId != null ? String(category.mainCategoryId) : '');
  };

  const saveEditSub = (id: number) => {
    if (!editingSubName.trim()) return;
    updateSubMutation.mutate(
      {
        id,
        input: {
          name: editingSubName.trim(),
          mainCategoryId: editingSubMainId === '' ? null : Number(editingSubMainId),
        },
      },
      { onSuccess: () => setEditingSubId(null) },
    );
  };

  const handleRemoveSub = (category: SubCategory) => setPendingDelete({ type: 'sub', category });

  // ConfirmDialog에서 실제로 선택했을 때만 호출 — deleteSubItems=false(분리)/true(함께삭제)
  const confirmDelete = (deleteSubItems: boolean) => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'main') {
      removeMainMutation.mutate({ id: pendingDelete.category.id, deleteSubItems });
    } else {
      removeSubMutation.mutate({ id: pendingDelete.category.id, deleteSubItems });
    }
    setPendingDelete(null);
  };

  // 서브카테고리를 메인카테고리별로 묶음(할 일 목록과 동일한 패턴) — 서브가
  // 하나도 없는 메인카테고리는 접기 UI에 아예 안 보이게 걸러냄
  const subGroups = [
    ...mainCategories.map((main) => ({
      key: `main-${main.id}`,
      label: main.name,
      subs: subCategories.filter((sub) => sub.mainCategoryId === main.id),
    })),
    { key: 'main-none', label: '미분류', subs: subCategories.filter((sub) => sub.mainCategoryId == null) },
  ].filter((group) => group.subs.length > 0);

  const renderSubCategory = (category: SubCategory) => (
    <li
      key={category.id}
      className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
    >
      {editingSubId === category.id ? (
        <div className="flex flex-1 flex-wrap gap-2">
          <select
            value={editingSubMainId}
            onChange={(e) => setEditingSubMainId(e.target.value)}
            className={fieldClass}
          >
            <option value="">메인 카테고리 없음</option>
            {mainCategories.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            value={editingSubName}
            onChange={(e) => setEditingSubName(e.target.value)}
            autoFocus
            className={`flex-1 ${fieldClass}`}
          />
          <button type="button" onClick={() => saveEditSub(category.id)} className={saveButtonClass}>
            저장
          </button>
          <button type="button" onClick={() => setEditingSubId(null)} className={deleteButtonClass}>
            취소
          </button>
        </div>
      ) : (
        <>
          <span>{category.name}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => startEditSub(category)} className={primaryButtonClass}>
              수정
            </button>
            <button type="button" onClick={() => handleRemoveSub(category)} className={deleteButtonClass}>
              삭제
            </button>
          </div>
        </>
      )}
    </li>
  );

  const pendingDeleteLabel = pendingDelete
    ? pendingDelete.type === 'main'
      ? `메인 카테고리 "${pendingDelete.category.name}"`
      : `서브 카테고리 "${pendingDelete.category.name}"`
    : '';

  return (
    <PageContainer>
      <h1 className="mb-4 text-2xl font-bold">카테고리 관리</h1>

      {error && <p className="text-sm text-red-600">{extractErrorMessage(error, '요청을 처리하지 못했습니다.')}</p>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-base font-semibold">메인 카테고리</h2>
            <form onSubmit={handleCreateMain} className="mb-3 flex flex-wrap gap-2">
              <input
                placeholder="메인 카테고리 이름"
                value={newMainName}
                onChange={(e) => setNewMainName(e.target.value)}
                className={`flex-1 ${fieldClass}`}
              />
              <button type="submit" disabled={createMainMutation.isPending} className={primaryButtonClass}>
                추가
              </button>
            </form>

            <ul className="flex list-none flex-col gap-2 p-0">
              {mainCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                >
                  {editingMainId === category.id ? (
                    <div className="flex flex-1 flex-wrap gap-2">
                      <input
                        value={editingMainName}
                        onChange={(e) => setEditingMainName(e.target.value)}
                        autoFocus
                        className={`flex-1 ${fieldClass}`}
                      />
                      <button type="button" onClick={() => saveEditMain(category.id)} className={saveButtonClass}>
                        저장
                      </button>
                      <button type="button" onClick={() => setEditingMainId(null)} className={deleteButtonClass}>
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{category.name}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEditMain(category)} className={primaryButtonClass}>
                          수정
                        </button>
                        <button type="button" onClick={() => handleRemoveMain(category)} className={deleteButtonClass}>
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {mainCategories.length === 0 && <p>등록된 메인 카테고리가 없습니다.</p>}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-base font-semibold">서브 카테고리</h2>
            <form onSubmit={handleCreateSub} className="mb-3 flex flex-wrap gap-2">
              <select
                value={newSubMainId}
                onChange={(e) => setNewSubMainId(e.target.value)}
                className={fieldClass}
              >
                <option value="">메인 카테고리 없음</option>
                {mainCategories.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="서브 카테고리 이름"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className={`flex-1 ${fieldClass}`}
              />
              <button type="submit" disabled={createSubMutation.isPending} className={primaryButtonClass}>
                추가
              </button>
            </form>

            <div className="flex flex-col gap-4">
              {subGroups.map((group) => (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-800 hover:cursor-pointer"
                  >
                    <span className="text-xs text-gray-400">
                      {collapsedGroups.has(group.key) ? '▶' : '▼'}
                    </span>
                    {group.label}
                  </button>
                  {!collapsedGroups.has(group.key) && (
                    <ul className="flex list-none flex-col gap-2 border-l-2 border-gray-200 p-0 pl-4">
                      {group.subs.map(renderSubCategory)}
                    </ul>
                  )}
                </div>
              ))}
              {subCategories.length === 0 && <p>등록된 서브 카테고리가 없습니다.</p>}
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`${pendingDeleteLabel} 삭제`}
        message="하위 항목을 어떻게 할까요?"
        onCancel={() => setPendingDelete(null)}
        actions={[
          { label: '취소', onClick: () => setPendingDelete(null) },
          { label: '이 카테고리만 삭제(하위 유지)', onClick: () => confirmDelete(false) },
          { label: '하위 항목도 함께 삭제', onClick: () => confirmDelete(true), variant: 'danger' },
        ]}
      />
    </PageContainer>
  );
}
