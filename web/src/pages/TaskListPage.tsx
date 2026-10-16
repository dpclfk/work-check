import { FormEvent, useEffect, useState } from 'react';
import { CreateTaskInput, Task, TaskCycle, UpdateTaskInput, tasksApi } from '../api/tasks';
import { MainCategory, SubCategory, mainCategoriesApi, subCategoriesApi } from '../api/categories';
import { PageContainer } from '../components/PageContainer';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

const CYCLE_LABEL: Record<TaskCycle, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
  ONCE: '한 번만',
};

const DEFAULT_FORM: CreateTaskInput = {
  name: '',
  cycleType: 'DAILY',
  deadLine: 22,
  remindTime: 21,
};

const fieldClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const buttonClass = 'whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:cursor-pointer hover:bg-gray-100';
// 카테고리:제목 = 3:7 비율. min-w-0 없으면 flex item의 암묵적 min-width:auto 때문에
// 긴 텍스트가 선택됐을 때 비율이 깨짐(실제로 겪었던 버그)
const categorySelectClass = `flex-[3] min-w-0 ${fieldClass}`;
const titleInputClass = `flex-[7] min-w-0 ${fieldClass}`;
const hourInputClass = 'flex items-center gap-1 text-xs text-gray-500';
// 숫자 input의 위아래 화살표(스피너) 제거 — Firefox는 appearance:textfield로,
// Chrome/Safari(WebKit)는 스피너 버튼 pseudo-element를 직접 없애야 함
const hourNumberClass = `w-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${fieldClass}`;

export function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateTaskInput>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateTaskInput>({});
  const [editError, setEditError] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      setTasks(await tasksApi.list());
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const [mains, subs] = await Promise.all([mainCategoriesApi.list(), subCategoriesApi.list()]);
    setMainCategories(mains);
    setSubCategories(subs);
  };

  useEffect(() => {
    loadTasks();
    loadCategories();
  }, []);

  // 메인카테고리 없는 서브카테고리는 "미분류" 그룹으로 묶어서 보여줌
  const subCategoryGroups = [
    ...mainCategories.map((main) => ({
      label: main.name,
      subs: subCategories.filter((sub) => sub.mainCategoryId === main.id),
    })),
    { label: '미분류', subs: subCategories.filter((sub) => sub.mainCategoryId == null) },
  ].filter((group) => group.subs.length > 0);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) return;
    if (form.cycleType === 'ONCE' && !form.dueDate) return;
    if (form.deadLine === form.remindTime) {
      setFormError('알림 시각과 마감 시각은 같을 수 없습니다.');
      return;
    }
    try {
      await tasksApi.create(form);
      setForm(DEFAULT_FORM);
      await loadTasks();
    } catch (err) {
      setFormError(extractErrorMessage(err, '할 일을 추가하지 못했습니다.'));
    }
  };

  const handleComplete = async (id: number) => {
    await tasksApi.complete(id);
    await loadTasks();
  };

  const handleRemove = async (id: number) => {
    await tasksApi.remove(id);
    await loadTasks();
  };

  const handleToggleActive = async (task: Task) => {
    await tasksApi.setActive(task.id, !task.isActive);
    await loadTasks();
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditError(null);
    setEditForm({
      subCategoryId: task.subCategoryId ?? null,
      name: task.name,
      cycleType: task.cycleType,
      cycleValue: task.cycleValue,
      dueDate: task.dueDate,
      deadLine: task.deadLine,
      remindTime: task.remindTime,
    });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditError(null);
  };

  const saveEdit = async (id: number) => {
    setEditError(null);
    if (!editForm.name?.trim()) return;
    if (editForm.cycleType === 'ONCE' && !editForm.dueDate) return;
    if (editForm.deadLine === editForm.remindTime) {
      setEditError('알림 시각과 마감 시각은 같을 수 없습니다.');
      return;
    }
    try {
      await tasksApi.update(id, editForm);
      setEditingTaskId(null);
      await loadTasks();
    } catch (err) {
      setEditError(extractErrorMessage(err, '수정하지 못했습니다.'));
    }
  };

  return (
    <PageContainer>
      <h1 className="mb-4 text-2xl font-bold">할 일 체크리스트</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2">
        <div className="flex min-w-0 flex-1 gap-2 max-[961px]:w-full">
          <select
            className={categorySelectClass}
            value={form.subCategoryId ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                subCategoryId: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          >
            <option value="">카테고리 없음</option>
            {subCategoryGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.subs.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            className={titleInputClass}
            placeholder="할 일 제목"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 max-[961px]:w-full">
          <select
            value={form.cycleType}
            onChange={(e) => setForm({ ...form, cycleType: e.target.value as TaskCycle })}
            className={fieldClass}
          >
            <option value="DAILY">매일</option>
            <option value="WEEKLY">매주</option>
            <option value="MONTHLY">매월</option>
            <option value="ONCE">한 번만</option>
          </select>
          {form.cycleType === 'ONCE' && (
            <input
              type="date"
              value={form.dueDate ?? ''}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className={`flex-1 ${fieldClass}`}
            />
          )}
          <label className={hourInputClass}>
            알림
            <input
              type="number"
              min={0}
              max={23}
              value={form.remindTime}
              onChange={(e) => setForm({ ...form, remindTime: Number(e.target.value) })}
              className={hourNumberClass}
            />
            시
          </label>
          <label className={hourInputClass}>
            마감
            <input
              type="number"
              min={0}
              max={23}
              value={form.deadLine}
              onChange={(e) => setForm({ ...form, deadLine: Number(e.target.value) })}
              className={hourNumberClass}
            />
            시
          </label>
          <button type="submit" className={buttonClass}>
            추가
          </button>
        </div>
      </form>
      {formError && <p className="text-sm text-red-600">{formError}</p>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <ul className="flex list-none flex-col gap-2 p-0">
          {tasks.map((task) =>
            editingTaskId === task.id ? (
              <li
                key={task.id}
                className="rounded-lg bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                <div className="flex flex-wrap gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 max-[961px]:w-full">
                    <select
                      className={categorySelectClass}
                      value={editForm.subCategoryId ?? ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          subCategoryId: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">카테고리 없음</option>
                      {subCategoryGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.subs.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      className={titleInputClass}
                      placeholder="할 일 제목"
                      value={editForm.name ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 max-[961px]:w-full">
                    <select
                      value={editForm.cycleType}
                      onChange={(e) => setEditForm({ ...editForm, cycleType: e.target.value as TaskCycle })}
                      className={fieldClass}
                    >
                      <option value="DAILY">매일</option>
                      <option value="WEEKLY">매주</option>
                      <option value="MONTHLY">매월</option>
                      <option value="ONCE">한 번만</option>
                    </select>
                    {editForm.cycleType === 'ONCE' && (
                      <input
                        type="date"
                        value={editForm.dueDate ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                        className={fieldClass}
                      />
                    )}
                    <label className={hourInputClass}>
                      알림
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={editForm.remindTime ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, remindTime: Number(e.target.value) })}
                        className={hourNumberClass}
                      />
                      시
                    </label>
                    <label className={hourInputClass}>
                      마감
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={editForm.deadLine ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, deadLine: Number(e.target.value) })}
                        className={hourNumberClass}
                      />
                      시
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(task.id)} className={buttonClass}>
                        저장
                      </button>
                      <button type="button" onClick={cancelEdit} className={buttonClass}>
                        취소
                      </button>
                    </div>
                  </div>
                </div>
                {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}
              </li>
            ) : (
              <li
                key={task.id}
                className={`flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${
                  task.isActive ? '' : 'opacity-60'
                }`}
              >
                <div>
                  <strong>{task.name}</strong>
                  {task.subCategory && (
                    <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                      {task.subCategory.mainCategory ? `${task.subCategory.mainCategory.name} / ` : ''}
                      {task.subCategory.name}
                    </span>
                  )}
                  <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                    {CYCLE_LABEL[task.cycleType]}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">{task.deadLine}시까지</span>
                  {task.isCompleted && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600">
                      완료
                    </span>
                  )}
                  {!task.isActive && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      꺼짐
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleComplete(task.id)} className={buttonClass}>
                    완료
                  </button>
                  <button onClick={() => startEdit(task)} className={buttonClass}>
                    수정
                  </button>
                  <button onClick={() => handleToggleActive(task)} className={buttonClass}>
                    {task.isActive ? '끄기' : '켜기'}
                  </button>
                  <button onClick={() => handleRemove(task.id)} className={buttonClass}>
                    삭제
                  </button>
                </div>
              </li>
            ),
          )}
          {tasks.length === 0 && <p>등록된 할 일이 없습니다.</p>}
        </ul>
      )}
    </PageContainer>
  );
}
