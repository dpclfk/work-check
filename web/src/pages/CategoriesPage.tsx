import { FormEvent, useEffect, useState } from 'react';
import { MainCategory, SubCategory, mainCategoriesApi, subCategoriesApi } from '../api/categories';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

/** 삭제 전 하위 항목까지 같이 지울지 물어봄 — OK면 같이 삭제, 취소면 분리(null)만 */
function confirmDeleteSubItems(target: string): boolean {
  return window.confirm(
    `${target}를 삭제합니다.\n\n확인 — 하위 항목까지 함께 삭제\n취소 — 이 카테고리만 삭제하고 하위 항목은 유지(분리)`,
  );
}

interface CategoriesPageProps {
  onBack: () => void;
}

export function CategoriesPage({ onBack }: CategoriesPageProps) {
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMainName, setNewMainName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubMainId, setNewSubMainId] = useState<string>('');

  const [editingMainId, setEditingMainId] = useState<number | null>(null);
  const [editingMainName, setEditingMainName] = useState('');
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [editingSubMainId, setEditingSubMainId] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mains, subs] = await Promise.all([mainCategoriesApi.list(), subCategoriesApi.list()]);
      setMainCategories(mains);
      setSubCategories(subs);
    } catch (err) {
      setError(extractErrorMessage(err, '카테고리를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateMain = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMainName.trim()) return;
    setError(null);
    try {
      await mainCategoriesApi.create(newMainName.trim());
      setNewMainName('');
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, '메인 카테고리를 추가하지 못했습니다.'));
    }
  };

  const handleCreateSub = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setError(null);
    try {
      await subCategoriesApi.create(newSubName.trim(), newSubMainId === '' ? null : Number(newSubMainId));
      setNewSubName('');
      setNewSubMainId('');
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, '서브 카테고리를 추가하지 못했습니다.'));
    }
  };

  const startEditMain = (category: MainCategory) => {
    setEditingMainId(category.id);
    setEditingMainName(category.name);
  };

  const saveEditMain = async (id: number) => {
    if (!editingMainName.trim()) return;
    setError(null);
    try {
      await mainCategoriesApi.rename(id, editingMainName.trim());
      setEditingMainId(null);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, '수정하지 못했습니다.'));
    }
  };

  const handleRemoveMain = async (category: MainCategory) => {
    const deleteSubItems = confirmDeleteSubItems(`메인 카테고리 "${category.name}"`);
    setError(null);
    try {
      await mainCategoriesApi.remove(category.id, deleteSubItems);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, '삭제하지 못했습니다.'));
    }
  };

  const startEditSub = (category: SubCategory) => {
    setEditingSubId(category.id);
    setEditingSubName(category.name);
    setEditingSubMainId(category.mainCategoryId != null ? String(category.mainCategoryId) : '');
  };

  const saveEditSub = async (id: number) => {
    if (!editingSubName.trim()) return;
    setError(null);
    try {
      await subCategoriesApi.update(id, {
        name: editingSubName.trim(),
        mainCategoryId: editingSubMainId === '' ? null : Number(editingSubMainId),
      });
      setEditingSubId(null);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, '수정하지 못했습니다.'));
    }
  };

  const handleRemoveSub = async (category: SubCategory) => {
    const deleteSubItems = confirmDeleteSubItems(`서브 카테고리 "${category.name}"`);
    setError(null);
    try {
      await subCategoriesApi.remove(category.id, deleteSubItems);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, '삭제하지 못했습니다.'));
    }
  };

  const mainCategoryName = (id?: number | null) =>
    mainCategories.find((m) => m.id === id)?.name ?? null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>카테고리 관리</h1>
        <button type="button" className="logout-button" onClick={onBack}>
          ← 할 일로
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <section className="category-section">
            <h2>메인 카테고리</h2>
            <form onSubmit={handleCreateMain} className="category-form">
              <input
                placeholder="메인 카테고리 이름"
                value={newMainName}
                onChange={(e) => setNewMainName(e.target.value)}
              />
              <button type="submit">추가</button>
            </form>

            <ul className="category-list">
              {mainCategories.map((category) => (
                <li key={category.id} className="category-item">
                  {editingMainId === category.id ? (
                    <div className="category-edit-row">
                      <input
                        value={editingMainName}
                        onChange={(e) => setEditingMainName(e.target.value)}
                        autoFocus
                      />
                      <button type="button" onClick={() => saveEditMain(category.id)}>
                        저장
                      </button>
                      <button type="button" onClick={() => setEditingMainId(null)}>
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{category.name}</span>
                      <div className="actions">
                        <button type="button" onClick={() => startEditMain(category)}>
                          수정
                        </button>
                        <button type="button" onClick={() => handleRemoveMain(category)}>
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

          <section className="category-section">
            <h2>서브 카테고리</h2>
            <form onSubmit={handleCreateSub} className="category-form">
              <input
                placeholder="서브 카테고리 이름"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
              />
              <select value={newSubMainId} onChange={(e) => setNewSubMainId(e.target.value)}>
                <option value="">메인 카테고리 없음</option>
                {mainCategories.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button type="submit">추가</button>
            </form>

            <ul className="category-list">
              {subCategories.map((category) => (
                <li key={category.id} className="category-item">
                  {editingSubId === category.id ? (
                    <div className="category-edit-row">
                      <input
                        value={editingSubName}
                        onChange={(e) => setEditingSubName(e.target.value)}
                        autoFocus
                      />
                      <select
                        value={editingSubMainId}
                        onChange={(e) => setEditingSubMainId(e.target.value)}
                      >
                        <option value="">메인 카테고리 없음</option>
                        {mainCategories.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => saveEditSub(category.id)}>
                        저장
                      </button>
                      <button type="button" onClick={() => setEditingSubId(null)}>
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>
                        {category.name}
                        {mainCategoryName(category.mainCategoryId) && (
                          <span className="badge">{mainCategoryName(category.mainCategoryId)}</span>
                        )}
                      </span>
                      <div className="actions">
                        <button type="button" onClick={() => startEditSub(category)}>
                          수정
                        </button>
                        <button type="button" onClick={() => handleRemoveSub(category)}>
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {subCategories.length === 0 && <p>등록된 서브 카테고리가 없습니다.</p>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
