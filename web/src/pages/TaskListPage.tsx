import { FormEvent, useEffect, useState } from 'react';
import { CreateTaskInput, Task, TaskCycle, tasksApi } from '../api/tasks';

const CYCLE_LABEL: Record<TaskCycle, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
};

export function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateTaskInput>({
    title: '',
    cycleType: 'DAILY',
    reminderTime: '21:00',
  });

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
    if (!form.title.trim()) return;
    await tasksApi.create(form);
    setForm({ title: '', cycleType: 'DAILY', reminderTime: '21:00' });
    await loadTasks();
  };

  const handleComplete = async (id: number) => {
    await tasksApi.complete(id);
    await loadTasks();
  };

  const handleRemove = async (id: number) => {
    await tasksApi.remove(id);
    await loadTasks();
  };

  return (
    <div className="page">
      <h1>할 일 체크리스트</h1>

      <form onSubmit={handleSubmit} className="task-form">
        <input
          placeholder="할 일 제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <select
          value={form.cycleType}
          onChange={(e) => setForm({ ...form, cycleType: e.target.value as TaskCycle })}
        >
          <option value="DAILY">매일</option>
          <option value="WEEKLY">매주</option>
          <option value="MONTHLY">매월</option>
        </select>
        <input
          type="time"
          value={form.reminderTime}
          onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
        />
        <button type="submit">추가</button>
      </form>

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <div>
                <strong>{task.title}</strong>
                <span className="badge">{CYCLE_LABEL[task.cycleType]}</span>
                <span className="time">{task.reminderTime}까지</span>
              </div>
              <div className="actions">
                <button onClick={() => handleComplete(task.id)}>완료</button>
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
