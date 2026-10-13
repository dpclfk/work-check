import { FormEvent, useEffect, useState } from 'react';
import { CreateTaskInput, Task, TaskCycle, UpdateTaskInput, tasksApi } from '../api/tasks';
import { MainCategory, SubCategory, mainCategoriesApi, subCategoriesApi } from '../api/categories';

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
    <div className="page">
      <h1>할 일 체크리스트</h1>

      <form onSubmit={handleSubmit} className="task-form">
        <input
          placeholder="할 일 제목"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
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
                  {`${group.label} / ${sub.name}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          value={form.cycleType}
          onChange={(e) => setForm({ ...form, cycleType: e.target.value as TaskCycle })}
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
          />
        )}
        <label className="hour-input">
          알림
          <input
            type="number"
            min={0}
            max={23}
            value={form.remindTime}
            onChange={(e) => setForm({ ...form, remindTime: Number(e.target.value) })}
          />
          시
        </label>
        <label className="hour-input">
          마감
          <input
            type="number"
            min={0}
            max={23}
            value={form.deadLine}
            onChange={(e) => setForm({ ...form, deadLine: Number(e.target.value) })}
          />
          시
        </label>
        <button type="submit">추가</button>
      </form>
      {formError && <p className="auth-error">{formError}</p>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) =>
            editingTaskId === task.id ? (
              <li key={task.id} className="task-item-editing">
                <div className="task-edit-form">
                  <input
                    placeholder="할 일 제목"
                    value={editForm.name ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <select
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
                  <select
                    value={editForm.cycleType}
                    onChange={(e) => setEditForm({ ...editForm, cycleType: e.target.value as TaskCycle })}
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
                    />
                  )}
                  <label className="hour-input">
                    알림
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={editForm.remindTime ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, remindTime: Number(e.target.value) })}
                    />
                    시
                  </label>
                  <label className="hour-input">
                    마감
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={editForm.deadLine ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, deadLine: Number(e.target.value) })}
                    />
                    시
                  </label>
                  <div className="actions">
                    <button type="button" onClick={() => saveEdit(task.id)}>
                      저장
                    </button>
                    <button type="button" onClick={cancelEdit}>
                      취소
                    </button>
                  </div>
                </div>
                {editError && <p className="auth-error">{editError}</p>}
              </li>
            ) : (
              <li key={task.id} className={`task-item${task.isActive ? '' : ' task-item-inactive'}`}>
                <div>
                  <strong>{task.name}</strong>
                  {task.subCategory && (
                    <span className="badge">
                      {task.subCategory.mainCategory ? `${task.subCategory.mainCategory.name} / ` : ''}
                      {task.subCategory.name}
                    </span>
                  )}
                  <span className="badge">{CYCLE_LABEL[task.cycleType]}</span>
                  <span className="time">{task.deadLine}시까지</span>
                  {!task.isActive && <span className="badge badge-off">꺼짐</span>}
                </div>
                <div className="actions">
                  <button onClick={() => handleComplete(task.id)}>완료</button>
                  <button onClick={() => startEdit(task)}>수정</button>
                  <button onClick={() => handleToggleActive(task)}>
                    {task.isActive ? '끄기' : '켜기'}
                  </button>
                  <button onClick={() => handleRemove(task.id)}>삭제</button>
                </div>
              </li>
            ),
          )}
          {tasks.length === 0 && <p>등록된 할 일이 없습니다.</p>}
        </ul>
      )}
    </div>
  );
}
