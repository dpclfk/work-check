import { FormEvent, useEffect, useState } from 'react';
import { CreateTaskInput, Task, TaskCycle, tasksApi } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';

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

interface TaskListPageProps {
  onOpenSettings: () => void;
}

export function TaskListPage({ onOpenSettings }: TaskListPageProps) {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateTaskInput>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      setTasks(await tasksApi.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

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

  return (
    <div className="page">
      <div className="page-header">
        <h1>할 일 체크리스트</h1>
        <div className="user-bar">
          <span className="user-email">{user?.email}</span>
          <button type="button" className="logout-button" onClick={onOpenSettings}>
            설정
          </button>
          <button type="button" className="logout-button" onClick={logout}>
            로그아웃
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        <input
          placeholder="할 일 제목"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
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
          {tasks.map((task) => (
            <li key={task.id} className={`task-item${task.isActive ? '' : ' task-item-inactive'}`}>
              <div>
                <strong>{task.name}</strong>
                <span className="badge">{CYCLE_LABEL[task.cycleType]}</span>
                <span className="time">{task.deadLine}시까지</span>
                {!task.isActive && <span className="badge badge-off">꺼짐</span>}
              </div>
              <div className="actions">
                <button onClick={() => handleComplete(task.id)}>완료</button>
                <button onClick={() => handleToggleActive(task)}>
                  {task.isActive ? '끄기' : '켜기'}
                </button>
                <button onClick={() => handleRemove(task.id)}>삭제</button>
              </div>
            </li>
          ))}
          {tasks.length === 0 && <p>등록된 할 일이 없습니다.</p>}
        </ul>
      )}
    </div>
  );
}
