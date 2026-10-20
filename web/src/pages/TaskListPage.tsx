import { FormEvent, useState } from 'react';
import { CreateTaskInput, Task, TaskCycle, UpdateTaskInput } from '../api/tasks';
import { PageContainer } from '../components/PageContainer';
import { useMainCategoriesQuery, useSubCategoriesQuery } from '../queries/categories';
import {
  useCompleteTaskMutation,
  useCreateTaskMutation,
  useRemoveTaskMutation,
  useSetTaskActiveMutation,
  useTasksQuery,
  useUpdateTaskMutation,
} from '../queries/tasks';

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

// getWallClock()의 WEEKDAY_INDEX(일=0~토=6)와 동일한 순서
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** cycleType을 바꿀 때 cycleValue 기본값 — WEEKLY/MONTHLY는 "오늘"로 미리 채워서
 * 사용자가 아예 안 건드려도 항상 유효한 값이 전송되게 함(서버가 cycleValue
 * 없으면 400으로 막음 — CLAUDE.md의 cycleValue 버그 참고) */
function defaultCycleValue(cycleType: TaskCycle): number | undefined {
  const now = new Date();
  if (cycleType === 'WEEKLY') return now.getDay(); // 0(일)~6(토)
  if (cycleType === 'MONTHLY') return now.getDate(); // 1~31
  return undefined;
}

/** 목록에 "매주 월요일" / "매월 15일"처럼 요일·날짜까지 같이 보여줌.
 * cycleValue가 없는(예전에 만들어진) 레거시 할 일은 날짜 없이 기본 라벨만 */
function cycleLabel(task: Task): string {
  if (task.cycleType === 'WEEKLY' && task.cycleValue != null) {
    return `매주 ${WEEKDAY_LABELS[task.cycleValue]}요일`;
  }
  if (task.cycleType === 'MONTHLY' && task.cycleValue != null) {
    return `매월 ${task.cycleValue}일`;
  }
  return CYCLE_LABEL[task.cycleType];
}

const DEFAULT_FORM: CreateTaskInput = {
  name: '',
  cycleType: 'DAILY',
  deadLine: 22,
  remindTime: 21,
};

const fieldClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const buttonClass =
  'whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:cursor-pointer hover:bg-gray-100';
// 추가/수정은 앱의 "추가" 버튼과 같은 색, 완료는 완료 뱃지와 같은 색(emerald),
// 삭제는 빨간색 — 나머지(켜기/끄기, 저장, 취소)는 기존 중립 버튼 그대로
const primaryButtonClass =
  'whitespace-nowrap rounded-lg bg-indigo-700 px-3 py-1.5 text-sm text-white hover:cursor-pointer hover:bg-indigo-800';
const completeButtonClass =
  'whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:cursor-pointer hover:bg-emerald-700';
const deleteButtonClass =
  'whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:cursor-pointer hover:bg-red-700';
// 카테고리:제목 = 3:7 비율. min-w-0 없으면 flex item의 암묵적 min-width:auto 때문에
// 긴 텍스트가 선택됐을 때 비율이 깨짐(실제로 겪었던 버그)
const categorySelectClass = `flex-[3] min-w-0 ${fieldClass}`;
const titleInputClass = `flex-[7] min-w-0 ${fieldClass}`;
const hourInputClass = 'flex items-center gap-1 text-xs text-gray-500';
// 숫자 input의 위아래 화살표(스피너) 제거 — Firefox는 appearance:textfield로,
// Chrome/Safari(WebKit)는 스피너 버튼 pseudo-element를 직접 없애야 함
const hourNumberClass = `w-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${fieldClass}`;

export function TaskListPage() {
  const { data: tasks = [], isLoading: loading } = useTasksQuery();
  const { data: mainCategories = [] } = useMainCategoriesQuery();
  const { data: subCategories = [] } = useSubCategoriesQuery();

  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const completeMutation = useCompleteTaskMutation();
  const removeMutation = useRemoveTaskMutation();
  const setActiveMutation = useSetTaskActiveMutation();

  const [form, setForm] = useState<CreateTaskInput>(DEFAULT_FORM);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateTaskInput>({});
  const [editValidationError, setEditValidationError] = useState<string | null>(null);

  // 메인카테고리 없는 서브카테고리는 "미분류" 그룹으로 묶어서 보여줌
  const subCategoryGroups = [
    ...mainCategories.map((main) => ({
      label: main.name,
      subs: subCategories.filter((sub) => sub.mainCategoryId === main.id),
    })),
    { label: '미분류', subs: subCategories.filter((sub) => sub.mainCategoryId == null) },
  ].filter((group) => group.subs.length > 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormValidationError(null);
    if (!form.name.trim()) return;
    if (form.cycleType === 'ONCE' && !form.dueDate) return;
    if (form.deadLine === form.remindTime) {
      setFormValidationError('알림 시각과 마감 시각은 같을 수 없습니다.');
      return;
    }
    createMutation.mutate(form, { onSuccess: () => setForm(DEFAULT_FORM) });
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditValidationError(null);
    setEditForm({
      subCategoryId: task.subCategoryId ?? null,
      name: task.name,
      cycleType: task.cycleType,
      // cycleValue 없이 저장된 레거시 WEEKLY/MONTHLY 할 일이면(예전 버그)
      // 오늘 날짜로 기본값 채움 — 수정 폼 열자마자 유효한 값이 보이게
      cycleValue: task.cycleValue ?? defaultCycleValue(task.cycleType),
      dueDate: task.dueDate,
      deadLine: task.deadLine,
      remindTime: task.remindTime,
    });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditValidationError(null);
  };

  const saveEdit = (id: number) => {
    setEditValidationError(null);
    if (!editForm.name?.trim()) return;
    if (editForm.cycleType === 'ONCE' && !editForm.dueDate) return;
    if (editForm.deadLine === editForm.remindTime) {
      setEditValidationError('알림 시각과 마감 시각은 같을 수 없습니다.');
      return;
    }
    updateMutation.mutate(
      { id, input: editForm },
      { onSuccess: () => setEditingTaskId(null) },
    );
  };

  const formError =
    formValidationError ??
    (createMutation.isError ? extractErrorMessage(createMutation.error, '할 일을 추가하지 못했습니다.') : null);
  const editError =
    editValidationError ??
    (updateMutation.isError ? extractErrorMessage(updateMutation.error, '수정하지 못했습니다.') : null);

  return (
    <PageContainer>
      <h1 className="mb-4 text-2xl font-bold">할 일 체크리스트</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2">
        <div className="flex min-w-0 flex-1 gap-2 max-[1101px]:w-full">
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

        <div className="flex flex-wrap items-center gap-2 max-[1101px]:w-full">
          <select
            value={form.cycleType}
            onChange={(e) => {
              const cycleType = e.target.value as TaskCycle;
              setForm({ ...form, cycleType, cycleValue: defaultCycleValue(cycleType) });
            }}
            className={fieldClass}
          >
            <option value="DAILY">매일</option>
            <option value="WEEKLY">매주</option>
            <option value="MONTHLY">매월</option>
            <option value="ONCE">한 번만</option>
          </select>
          {form.cycleType === 'WEEKLY' && (
            <select
              value={form.cycleValue ?? 0}
              onChange={(e) => setForm({ ...form, cycleValue: Number(e.target.value) })}
              className={fieldClass}
            >
              {WEEKDAY_LABELS.map((label, value) => (
                <option key={value} value={value}>
                  {label}요일
                </option>
              ))}
            </select>
          )}
          {form.cycleType === 'MONTHLY' && (
            <select
              value={form.cycleValue ?? 1}
              onChange={(e) => setForm({ ...form, cycleValue: Number(e.target.value) })}
              className={fieldClass}
            >
              {MONTH_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}일
                </option>
              ))}
            </select>
          )}
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
          <button type="submit" disabled={createMutation.isPending} className={primaryButtonClass}>
            {createMutation.isPending ? '추가 중...' : '추가'}
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
                  <div className="flex min-w-0 flex-1 items-center gap-2 max-[1101px]:w-full">
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

                  <div className="flex flex-wrap items-center gap-2 max-[1101px]:w-full">
                    <select
                      value={editForm.cycleType}
                      onChange={(e) => {
                        const cycleType = e.target.value as TaskCycle;
                        setEditForm({ ...editForm, cycleType, cycleValue: defaultCycleValue(cycleType) });
                      }}
                      className={fieldClass}
                    >
                      <option value="DAILY">매일</option>
                      <option value="WEEKLY">매주</option>
                      <option value="MONTHLY">매월</option>
                      <option value="ONCE">한 번만</option>
                    </select>
                    {editForm.cycleType === 'WEEKLY' && (
                      <select
                        value={editForm.cycleValue ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, cycleValue: Number(e.target.value) })}
                        className={fieldClass}
                      >
                        {WEEKDAY_LABELS.map((label, value) => (
                          <option key={value} value={value}>
                            {label}요일
                          </option>
                        ))}
                      </select>
                    )}
                    {editForm.cycleType === 'MONTHLY' && (
                      <select
                        value={editForm.cycleValue ?? 1}
                        onChange={(e) => setEditForm({ ...editForm, cycleValue: Number(e.target.value) })}
                        className={fieldClass}
                      >
                        {MONTH_DAYS.map((day) => (
                          <option key={day} value={day}>
                            {day}일
                          </option>
                        ))}
                      </select>
                    )}
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
                      <button
                        type="button"
                        onClick={() => saveEdit(task.id)}
                        disabled={updateMutation.isPending}
                        className={buttonClass}
                      >
                        {updateMutation.isPending ? '저장 중...' : '저장'}
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
                    {cycleLabel(task)}
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
                  <button onClick={() => completeMutation.mutate(task.id)} className={completeButtonClass}>
                    완료
                  </button>
                  <button onClick={() => startEdit(task)} className={primaryButtonClass}>
                    수정
                  </button>
                  <button
                    onClick={() => setActiveMutation.mutate({ id: task.id, isActive: !task.isActive })}
                    className={buttonClass}
                  >
                    {task.isActive ? '끄기' : '켜기'}
                  </button>
                  <button onClick={() => removeMutation.mutate(task.id)} className={deleteButtonClass}>
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
