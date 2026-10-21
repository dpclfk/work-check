import { useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CreateTaskInput, Task, TaskCycle, UpdateTaskInput } from '../api/tasks';
import { Dropdown, DropdownOption } from '../components/Dropdown';
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

const CYCLE_OPTIONS: DropdownOption<TaskCycle>[] = [
  { label: '매일', value: 'DAILY' },
  { label: '매주', value: 'WEEKLY' },
  { label: '매월', value: 'MONTHLY' },
  { label: '한 번만', value: 'ONCE' },
];

// getWallClock()의 WEEKDAY_INDEX(일=0~토=6)와 동일한 순서
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_OPTIONS: DropdownOption<number>[] = WEEKDAY_LABELS.map((label, value) => ({
  label: `${label}요일`,
  value,
}));
const MONTH_DAY_OPTIONS: DropdownOption<number>[] = Array.from({ length: 31 }, (_, i) => i + 1).map(
  (day) => ({ label: `${day}일`, value: day }),
);

const NO_CATEGORY = '__none__';

// 입력칸 공용 클래스 + 카드 공용 클래스(Tailwind로 못 표현하는 shadow는 인라인 elevation으로 보강)
const INPUT_CLASS = 'rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm';
const CARD_CLASS = 'rounded-xl bg-white p-4 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)]';

/** cycleType을 바꿀 때 cycleValue 기본값 — WEEKLY/MONTHLY는 "오늘"로 미리 채워서
 * 사용자가 아예 안 건드려도 항상 유효한 값이 전송되게 함(서버가 cycleValue
 * 없으면 400으로 막음 — CLAUDE.md의 cycleValue 버그 참고) */
function defaultCycleValue(cycleType: TaskCycle): number | undefined {
  const now = new Date();
  if (cycleType === 'WEEKLY') return now.getDay();
  if (cycleType === 'MONTHLY') return now.getDate();
  return undefined;
}

/** "화요일" / "20일" / "11월 20일"처럼 주기의 날짜 부분만. DAILY는 날짜가 없음(null) */
function dayLabel(task: Task): string | null {
  if (task.cycleType === 'WEEKLY' && task.cycleValue != null) {
    return `${WEEKDAY_LABELS[task.cycleValue]}요일`;
  }
  if (task.cycleType === 'MONTHLY' && task.cycleValue != null) {
    return `${task.cycleValue}일`;
  }
  if (task.cycleType === 'ONCE' && task.dueDate) {
    const [, month, day] = task.dueDate.split('-').map(Number);
    return `${month}월 ${day}일`;
  }
  return null;
}

/** "매주 화요일" / "매월 20일" / "매일"처럼 주기 전체 */
function cycleLabel(task: Task): string {
  const day = dayLabel(task);
  return day ? `${CYCLE_LABEL[task.cycleType]} ${day}` : CYCLE_LABEL[task.cycleType];
}

/** "매월 20일 22시까지"처럼 주기+날짜+마감 시각을 한 줄로 */
function deadlineLabel(task: Task): string {
  return `${cycleLabel(task)} ${task.deadLine}시까지`;
}

/** 알림 날짜 라벨 — remindTime이 deadLine보다 늦은 시각이면(예: 마감 22시,
 * 알림 23시) 그 알림은 "마감 당일"이 아니라 "마감 전날"에 울려야 의미가
 * 있어서(ReminderService도 "다음 마감까지 24시간 이내"로 판단해서 실제로
 * 전날 발송됨) 하루 앞당겨서 보여줌. DAILY는 날짜 개념이 없어서 그대로 null */
function remindDayLabel(task: Task): string | null {
  const needsPreviousDay = task.remindTime > task.deadLine;

  if (task.cycleType === 'WEEKLY' && task.cycleValue != null) {
    const weekday = needsPreviousDay ? (task.cycleValue + 6) % 7 : task.cycleValue;
    return `${WEEKDAY_LABELS[weekday]}요일`;
  }
  if (task.cycleType === 'MONTHLY' && task.cycleValue != null) {
    if (!needsPreviousDay) return `${task.cycleValue}일`;
    return task.cycleValue === 1 ? '말일' : `${task.cycleValue - 1}일`;
  }
  if (task.cycleType === 'ONCE' && task.dueDate) {
    const [y, m, d] = task.dueDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (needsPreviousDay) date.setUTCDate(date.getUTCDate() - 1);
    return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
  }
  return null;
}

/** "19일 23시 알림"처럼 날짜+알림 시각만(주기 종류는 deadlineLabel에 이미 나와서 안 반복) */
function remindLabel(task: Task): string {
  const day = remindDayLabel(task);
  return day ? `${day} ${task.remindTime}시 알림` : `${task.remindTime}시 알림`;
}

const DEFAULT_FORM: CreateTaskInput = {
  name: '',
  cycleType: 'DAILY',
  deadLine: 22,
  remindTime: 21,
};

// 메인/서브카테고리로 묶은 목록을 FlatList의 단일 평면 배열로 펼친 행 하나하나.
// FlatList는 중첩 구조를 직접 못 그리므로, "접기 상태까지 반영한" 평면 배열을
// 매 렌더마다 새로 만들어서 data로 넘김(접힌 그룹 아래 행은 아예 배열에서 제외)
type Row =
  | { type: 'main'; key: string; label: string; collapsed: boolean }
  | { type: 'sub'; key: string; label: string; collapsed: boolean }
  | { type: 'task'; key: string; task: Task };

type TaskFilter = 'all' | 'completed' | 'incomplete';

const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: '전체보기' },
  { value: 'completed', label: '완료된 할일 보기' },
  { value: 'incomplete', label: '미완료된 할 일 보기' },
];

export function TaskListScreen() {
  const { data: tasks = [], isRefetching, refetch } = useTasksQuery();
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
  // 접힌 그룹의 key 모음(메인/서브 카테고리 둘 다 이 Set 하나로 관리) — 기본은 전부 펼침
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // 전체/완료/미완료 필터 — 기본은 전체보기
  const [filter, setFilter] = useState<TaskFilter>('all');

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 메인카테고리별로 묶고(optgroup 대응), 메인카테고리 없는 건 "미분류"로 — web과 동일 (생성/수정 폼 드롭다운용)
  const subCategoryOptions: DropdownOption<string>[] = [{ label: '카테고리 없음', value: NO_CATEGORY }];
  const subCategoryDropdownGroups = [
    ...mainCategories.map((main) => ({
      label: main.name,
      subs: subCategories.filter((sub) => sub.mainCategoryId === main.id),
    })),
    { label: '미분류', subs: subCategories.filter((sub) => sub.mainCategoryId == null) },
  ].filter((g) => g.subs.length > 0);
  for (const group of subCategoryDropdownGroups) {
    subCategoryOptions.push({ label: group.label, value: '', isHeader: true });
    for (const sub of group.subs) {
      subCategoryOptions.push({ label: sub.name, value: String(sub.id) });
    }
  }

  // 전체/완료/미완료 필터 적용 — 아래 그룹핑이 이 배열 기준으로 돌기 때문에,
  // 필터링으로 한 서브카테고리의 할 일이 전부 걸러지면 그 서브카테고리(그리고
  // 그 서브카테고리가 마지막 남은 자식이었던 메인카테고리까지)도 자동으로
  // 접기 목록에서 사라짐(g.tasks.length > 0 필터가 그대로 적용돼서)
  const filteredTasks = tasks.filter((task) =>
    filter === 'all' ? true : filter === 'completed' ? task.isCompleted : !task.isCompleted,
  );

  // 할 일 목록을 메인카테고리 > 서브카테고리 > 할 일로 묶어서 FlatList용 평면 행으로 변환
  const tasksBySubId = new Map<number, Task[]>();
  const uncategorizedTasks: Task[] = [];
  for (const task of filteredTasks) {
    if (task.subCategoryId != null) {
      const list = tasksBySubId.get(task.subCategoryId) ?? [];
      list.push(task);
      tasksBySubId.set(task.subCategoryId, list);
    } else {
      uncategorizedTasks.push(task);
    }
  }
  const buildSubGroups = (mainCategoryId: number | null) =>
    subCategories
      .filter((sub) => sub.mainCategoryId === mainCategoryId)
      .map((sub) => ({ key: `sub-${sub.id}`, label: sub.name, tasks: tasksBySubId.get(sub.id) ?? [] }))
      .filter((g) => g.tasks.length > 0);
  const mainGroups = mainCategories
    .map((main) => ({ key: `main-${main.id}`, label: main.name, subGroups: buildSubGroups(main.id) }))
    .filter((g) => g.subGroups.length > 0);
  const uncategorizedSubGroups = buildSubGroups(null);
  if (uncategorizedSubGroups.length > 0) {
    mainGroups.push({ key: 'main-none', label: '미분류', subGroups: uncategorizedSubGroups });
  }

  const rows: Row[] = [];
  for (const mainGroup of mainGroups) {
    const mainCollapsed = collapsedGroups.has(mainGroup.key);
    rows.push({ type: 'main', key: mainGroup.key, label: mainGroup.label, collapsed: mainCollapsed });
    if (!mainCollapsed) {
      for (const subGroup of mainGroup.subGroups) {
        const subCollapsed = collapsedGroups.has(subGroup.key);
        rows.push({ type: 'sub', key: subGroup.key, label: subGroup.label, collapsed: subCollapsed });
        if (!subCollapsed) {
          for (const task of subGroup.tasks) {
            rows.push({ type: 'task', key: `task-${task.id}`, task });
          }
        }
      }
    }
  }
  if (uncategorizedTasks.length > 0) {
    const collapsed = collapsedGroups.has('uncategorized');
    rows.push({ type: 'main', key: 'uncategorized', label: '카테고리 없음', collapsed });
    if (!collapsed) {
      for (const task of uncategorizedTasks) rows.push({ type: 'task', key: `task-${task.id}`, task });
    }
  }

  const handleSubmit = () => {
    setFormValidationError(null);
    if (!form.name.trim()) return;
    if (form.cycleType === 'ONCE' && !form.dueDate) {
      setFormValidationError('한 번만 할 일은 날짜(YYYY-MM-DD)를 입력해야 합니다.');
      return;
    }
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
      // cycleValue 없이 저장된 레거시 WEEKLY/MONTHLY 할 일이면 오늘 날짜로 기본값 채움
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
    if (editForm.cycleType === 'ONCE' && !editForm.dueDate) {
      setEditValidationError('한 번만 할 일은 날짜(YYYY-MM-DD)를 입력해야 합니다.');
      return;
    }
    if (editForm.deadLine === editForm.remindTime) {
      setEditValidationError('알림 시각과 마감 시각은 같을 수 없습니다.');
      return;
    }
    updateMutation.mutate({ id, input: editForm }, { onSuccess: () => setEditingTaskId(null) });
  };

  const formError =
    formValidationError ??
    (createMutation.isError ? extractErrorMessage(createMutation.error, '할 일을 추가하지 못했습니다.') : null);
  const editError =
    editValidationError ??
    (updateMutation.isError ? extractErrorMessage(updateMutation.error, '수정하지 못했습니다.') : null);

  const createForm = (
    <View>
      <Text className="mb-3 text-xl font-bold">할 일 체크리스트</Text>

      <View className="mb-4 rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" style={{ elevation: 1 }}>
        <Dropdown
          value={form.subCategoryId != null ? String(form.subCategoryId) : NO_CATEGORY}
          options={subCategoryOptions}
          onChange={(v) =>
            setForm({ ...form, subCategoryId: v === NO_CATEGORY ? undefined : Number(v) })
          }
          className="mb-2.5"
        />
        <TextInput
          className={`${INPUT_CLASS} mb-2.5`}
          placeholder="할 일 제목"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <Dropdown
          value={form.cycleType}
          options={CYCLE_OPTIONS}
          onChange={(cycleType) => setForm({ ...form, cycleType, cycleValue: defaultCycleValue(cycleType) })}
          className="mb-2.5"
        />
        {form.cycleType === 'WEEKLY' && (
          <Dropdown
            value={form.cycleValue ?? 0}
            options={WEEKDAY_OPTIONS}
            onChange={(cycleValue) => setForm({ ...form, cycleValue })}
            className="mb-2.5"
          />
        )}
        {form.cycleType === 'MONTHLY' && (
          <Dropdown
            value={form.cycleValue ?? 1}
            options={MONTH_DAY_OPTIONS}
            onChange={(cycleValue) => setForm({ ...form, cycleValue })}
            className="mb-2.5"
          />
        )}
        {form.cycleType === 'ONCE' && (
          <TextInput
            className={`${INPUT_CLASS} mb-2.5`}
            placeholder="YYYY-MM-DD"
            value={form.dueDate ?? ''}
            onChangeText={(dueDate) => setForm({ ...form, dueDate })}
          />
        )}
        <View className="mb-2.5 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-xs text-[#6b7280]">알림(시)</Text>
            <TextInput
              className={INPUT_CLASS}
              keyboardType="number-pad"
              value={String(form.remindTime)}
              onChangeText={(v) => setForm({ ...form, remindTime: Number(v) || 0 })}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs text-[#6b7280]">마감(시)</Text>
            <TextInput
              className={INPUT_CLASS}
              keyboardType="number-pad"
              value={String(form.deadLine)}
              onChangeText={(v) => setForm({ ...form, deadLine: Number(v) || 0 })}
            />
          </View>
        </View>
        {formError && <Text className="mb-2 text-[13px] text-red-600">{formError}</Text>}
        <TouchableOpacity
          className="items-center rounded-lg bg-indigo-700 py-3"
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          <Text className="text-[15px] font-semibold text-white">
            {createMutation.isPending ? '추가 중...' : '추가'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mb-3 flex-row flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            className={`rounded-lg px-3 py-1.5 ${
              filter === opt.value ? 'bg-indigo-700' : 'border border-[#d1d5db] bg-white'
            }`}
            onPress={() => setFilter(opt.value)}
          >
            <Text
              className={`text-[13px] font-semibold ${
                filter === opt.value ? 'text-white' : 'text-[#374151]'
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTaskRow = (task: Task) =>
    editingTaskId === task.id ? (
      <View className={`${CARD_CLASS} ml-4`} style={{ elevation: 1 }}>
        <Dropdown
          value={editForm.subCategoryId != null ? String(editForm.subCategoryId) : NO_CATEGORY}
          options={subCategoryOptions}
          onChange={(v) =>
            setEditForm({ ...editForm, subCategoryId: v === NO_CATEGORY ? null : Number(v) })
          }
          className="mb-2.5"
        />
        <TextInput
          className={`${INPUT_CLASS} mb-2.5`}
          placeholder="할 일 제목"
          value={editForm.name ?? ''}
          onChangeText={(name) => setEditForm({ ...editForm, name })}
        />
        <Dropdown
          value={editForm.cycleType ?? 'DAILY'}
          options={CYCLE_OPTIONS}
          onChange={(cycleType) =>
            setEditForm({ ...editForm, cycleType, cycleValue: defaultCycleValue(cycleType) })
          }
          className="mb-2.5"
        />
        {editForm.cycleType === 'WEEKLY' && (
          <Dropdown
            value={editForm.cycleValue ?? 0}
            options={WEEKDAY_OPTIONS}
            onChange={(cycleValue) => setEditForm({ ...editForm, cycleValue })}
            className="mb-2.5"
          />
        )}
        {editForm.cycleType === 'MONTHLY' && (
          <Dropdown
            value={editForm.cycleValue ?? 1}
            options={MONTH_DAY_OPTIONS}
            onChange={(cycleValue) => setEditForm({ ...editForm, cycleValue })}
            className="mb-2.5"
          />
        )}
        {editForm.cycleType === 'ONCE' && (
          <TextInput
            className={`${INPUT_CLASS} mb-2.5`}
            placeholder="YYYY-MM-DD"
            value={editForm.dueDate ?? ''}
            onChangeText={(dueDate) => setEditForm({ ...editForm, dueDate })}
          />
        )}
        <View className="mb-2.5 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-xs text-[#6b7280]">알림(시)</Text>
            <TextInput
              className={INPUT_CLASS}
              keyboardType="number-pad"
              value={String(editForm.remindTime ?? 0)}
              onChangeText={(v) => setEditForm({ ...editForm, remindTime: Number(v) || 0 })}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs text-[#6b7280]">마감(시)</Text>
            <TextInput
              className={INPUT_CLASS}
              keyboardType="number-pad"
              value={String(editForm.deadLine ?? 0)}
              onChangeText={(v) => setEditForm({ ...editForm, deadLine: Number(v) || 0 })}
            />
          </View>
        </View>
        {editError && <Text className="mb-2 text-[13px] text-red-600">{editError}</Text>}
        <View className="mt-1 flex-row gap-2">
          <TouchableOpacity
            className="flex-1 items-center rounded-md bg-emerald-600 py-2"
            onPress={() => saveEdit(task.id)}
            disabled={updateMutation.isPending}
          >
            <Text className="text-[13px] font-semibold text-white">
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 items-center rounded-md bg-red-600 py-2" onPress={cancelEdit}>
            <Text className="text-[13px] font-semibold text-white">취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View
        className={`${CARD_CLASS} ml-4 flex-row items-center justify-between ${
          !task.isActive ? 'opacity-60' : ''
        }`}
        style={{ elevation: 1 }}
      >
        <View className="flex-1">
          <Text className="text-base font-semibold">{task.name}</Text>
          <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
            <View className="rounded-full bg-[#eef2ff] px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-indigo-700">{deadlineLabel(task)}</Text>
            </View>
            <Text className="text-xs text-[#6b7280]">{remindLabel(task)}</Text>
            {task.isCompleted && (
              <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-emerald-600">완료</Text>
              </View>
            )}
            {!task.isActive && (
              <View className="rounded-full bg-[#f3f4f6] px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-[#6b7280]">꺼짐</Text>
              </View>
            )}
          </View>
        </View>
        <View className="max-w-[110px] flex-row flex-wrap justify-end gap-1.5">
          <TouchableOpacity
            className="rounded-lg bg-emerald-600 px-3 py-[7px]"
            onPress={() => completeMutation.mutate(task.id)}
          >
            <Text className="text-xs font-semibold text-white">완료</Text>
          </TouchableOpacity>
          <TouchableOpacity className="rounded-lg bg-indigo-700 px-3 py-[7px]" onPress={() => startEdit(task)}>
            <Text className="text-xs font-semibold text-white">수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-lg bg-[#e5e7eb] px-3 py-[7px]"
            onPress={() => setActiveMutation.mutate({ id: task.id, isActive: !task.isActive })}
          >
            <Text className="text-xs font-semibold text-[#374151]">{task.isActive ? '끄기' : '켜기'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-lg bg-red-600 px-3 py-[7px]"
            onPress={() => removeMutation.mutate(task.id)}
          >
            <Text className="text-xs font-semibold text-white">삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  return (
    <FlatList
      className="flex-1 bg-[#f5f6f8]"
      data={rows}
      keyExtractor={(row) => row.key}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentContainerClassName="p-4 gap-2"
      ListHeaderComponent={createForm}
      ListEmptyComponent={
        <Text className="mt-8 text-center text-[#6b7280]">
          {tasks.length === 0 ? '등록된 할 일이 없습니다.' : '조건에 맞는 할 일이 없습니다.'}
        </Text>
      }
      renderItem={({ item: row }) => {
        if (row.type === 'main') {
          return (
            <TouchableOpacity
              className="mb-0.5 mt-1 flex-row items-center gap-1.5"
              onPress={() => toggleGroup(row.key)}
            >
              <Text className="text-[11px] text-[#9ca3af]">{row.collapsed ? '▶' : '▼'}</Text>
              <Text className="text-[15px] font-bold text-[#1f2937]">{row.label}</Text>
            </TouchableOpacity>
          );
        }
        if (row.type === 'sub') {
          return (
            <TouchableOpacity
              className="mb-0.5 ml-4 flex-row items-center gap-1.5"
              onPress={() => toggleGroup(row.key)}
            >
              <Text className="text-[10px] text-[#9ca3af]">{row.collapsed ? '▶' : '▼'}</Text>
              <Text className="text-[13px] font-semibold text-[#6b7280]">{row.label}</Text>
            </TouchableOpacity>
          );
        }
        return renderTaskRow(row.task);
      }}
    />
  );
}
