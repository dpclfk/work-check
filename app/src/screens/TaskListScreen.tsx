import { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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

/** cycleType을 바꿀 때 cycleValue 기본값 — WEEKLY/MONTHLY는 "오늘"로 미리 채워서
 * 사용자가 아예 안 건드려도 항상 유효한 값이 전송되게 함(서버가 cycleValue
 * 없으면 400으로 막음 — CLAUDE.md의 cycleValue 버그 참고) */
function defaultCycleValue(cycleType: TaskCycle): number | undefined {
  const now = new Date();
  if (cycleType === 'WEEKLY') return now.getDay();
  if (cycleType === 'MONTHLY') return now.getDate();
  return undefined;
}

/** 목록에 "매주 월요일" / "매월 15일"처럼 요일·날짜까지 같이 보여줌.
 * cycleValue가 없는(레거시) 할 일은 기본 라벨만 */
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

  // 메인카테고리별로 묶고(optgroup 대응), 메인카테고리 없는 건 "미분류"로 — web과 동일
  const subCategoryOptions: DropdownOption<string>[] = [{ label: '카테고리 없음', value: NO_CATEGORY }];
  const grouped = [
    ...mainCategories.map((main) => ({
      label: main.name,
      subs: subCategories.filter((sub) => sub.mainCategoryId === main.id),
    })),
    { label: '미분류', subs: subCategories.filter((sub) => sub.mainCategoryId == null) },
  ].filter((g) => g.subs.length > 0);
  for (const group of grouped) {
    subCategoryOptions.push({ label: group.label, value: '', isHeader: true });
    for (const sub of group.subs) {
      subCategoryOptions.push({ label: sub.name, value: String(sub.id) });
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
      <Text style={styles.title}>할 일 체크리스트</Text>

      <View style={styles.formCard}>
        <Dropdown
          value={form.subCategoryId != null ? String(form.subCategoryId) : NO_CATEGORY}
          options={subCategoryOptions}
          onChange={(v) =>
            setForm({ ...form, subCategoryId: v === NO_CATEGORY ? undefined : Number(v) })
          }
          style={styles.field}
        />
        <TextInput
          style={[styles.input, styles.field]}
          placeholder="할 일 제목"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <Dropdown
          value={form.cycleType}
          options={CYCLE_OPTIONS}
          onChange={(cycleType) => setForm({ ...form, cycleType, cycleValue: defaultCycleValue(cycleType) })}
          style={styles.field}
        />
        {form.cycleType === 'WEEKLY' && (
          <Dropdown
            value={form.cycleValue ?? 0}
            options={WEEKDAY_OPTIONS}
            onChange={(cycleValue) => setForm({ ...form, cycleValue })}
            style={styles.field}
          />
        )}
        {form.cycleType === 'MONTHLY' && (
          <Dropdown
            value={form.cycleValue ?? 1}
            options={MONTH_DAY_OPTIONS}
            onChange={(cycleValue) => setForm({ ...form, cycleValue })}
            style={styles.field}
          />
        )}
        {form.cycleType === 'ONCE' && (
          <TextInput
            style={[styles.input, styles.field]}
            placeholder="YYYY-MM-DD"
            value={form.dueDate ?? ''}
            onChangeText={(dueDate) => setForm({ ...form, dueDate })}
          />
        )}
        <View style={styles.hourRow}>
          <View style={styles.hourField}>
            <Text style={styles.hourLabel}>알림(시)</Text>
            <TextInput
              style={styles.hourInput}
              keyboardType="number-pad"
              value={String(form.remindTime)}
              onChangeText={(v) => setForm({ ...form, remindTime: Number(v) || 0 })}
            />
          </View>
          <View style={styles.hourField}>
            <Text style={styles.hourLabel}>마감(시)</Text>
            <TextInput
              style={styles.hourInput}
              keyboardType="number-pad"
              value={String(form.deadLine)}
              onChangeText={(v) => setForm({ ...form, deadLine: Number(v) || 0 })}
            />
          </View>
        </View>
        {formError && <Text style={styles.error}>{formError}</Text>}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={createMutation.isPending}>
          <Text style={styles.submitButtonText}>{createMutation.isPending ? '추가 중...' : '추가'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      data={tasks}
      keyExtractor={(task) => String(task.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={createForm}
      ListEmptyComponent={<Text style={styles.empty}>등록된 할 일이 없습니다.</Text>}
      renderItem={({ item }) =>
        editingTaskId === item.id ? (
          <View style={styles.card}>
            <Dropdown
              value={editForm.subCategoryId != null ? String(editForm.subCategoryId) : NO_CATEGORY}
              options={subCategoryOptions}
              onChange={(v) =>
                setEditForm({ ...editForm, subCategoryId: v === NO_CATEGORY ? null : Number(v) })
              }
              style={styles.field}
            />
            <TextInput
              style={[styles.input, styles.field]}
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
              style={styles.field}
            />
            {editForm.cycleType === 'WEEKLY' && (
              <Dropdown
                value={editForm.cycleValue ?? 0}
                options={WEEKDAY_OPTIONS}
                onChange={(cycleValue) => setEditForm({ ...editForm, cycleValue })}
                style={styles.field}
              />
            )}
            {editForm.cycleType === 'MONTHLY' && (
              <Dropdown
                value={editForm.cycleValue ?? 1}
                options={MONTH_DAY_OPTIONS}
                onChange={(cycleValue) => setEditForm({ ...editForm, cycleValue })}
                style={styles.field}
              />
            )}
            {editForm.cycleType === 'ONCE' && (
              <TextInput
                style={[styles.input, styles.field]}
                placeholder="YYYY-MM-DD"
                value={editForm.dueDate ?? ''}
                onChangeText={(dueDate) => setEditForm({ ...editForm, dueDate })}
              />
            )}
            <View style={styles.hourRow}>
              <View style={styles.hourField}>
                <Text style={styles.hourLabel}>알림(시)</Text>
                <TextInput
                  style={styles.hourInput}
                  keyboardType="number-pad"
                  value={String(editForm.remindTime ?? 0)}
                  onChangeText={(v) => setEditForm({ ...editForm, remindTime: Number(v) || 0 })}
                />
              </View>
              <View style={styles.hourField}>
                <Text style={styles.hourLabel}>마감(시)</Text>
                <TextInput
                  style={styles.hourInput}
                  keyboardType="number-pad"
                  value={String(editForm.deadLine ?? 0)}
                  onChangeText={(v) => setEditForm({ ...editForm, deadLine: Number(v) || 0 })}
                />
              </View>
            </View>
            {editError && <Text style={styles.error}>{editError}</Text>}
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => saveEdit(item.id)}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.smallButtonText}>{updateMutation.isPending ? '저장 중...' : '저장'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={cancelEdit}>
                <Text style={styles.smallButtonText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.item, !item.isActive && styles.itemInactive]}>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <View style={styles.badgeRow}>
                {item.subCategory && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.subCategory.mainCategory ? `${item.subCategory.mainCategory.name} / ` : ''}
                      {item.subCategory.name}
                    </Text>
                  </View>
                )}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cycleLabel(item)}</Text>
                </View>
                <Text style={styles.itemMeta}>{item.deadLine}시까지</Text>
                {item.isCompleted && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>완료</Text>
                  </View>
                )}
                {!item.isActive && (
                  <View style={styles.offBadge}>
                    <Text style={styles.offBadgeText}>꺼짐</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.completeButton} onPress={() => completeMutation.mutate(item.id)}>
                <Text style={styles.completeButtonText}>완료</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={() => startEdit(item)}>
                <Text style={styles.editButtonText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setActiveMutation.mutate({ id: item.id, isActive: !item.isActive })}
              >
                <Text style={styles.toggleButtonText}>{item.isActive ? '끄기' : '켜기'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => removeMutation.mutate(item.id)}>
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f5f6f8' },
  listContent: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  field: { marginBottom: 10 },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hourRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  hourField: { flex: 1 },
  hourLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  hourInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  submitButton: {
    backgroundColor: '#4338ca',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },
  itemMeta: { fontSize: 12, color: '#6b7280' },
  itemInactive: { opacity: 0.6 },
  badge: { backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#4338ca', fontSize: 11, fontWeight: '600' },
  doneBadge: { backgroundColor: '#d1fae5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  doneBadgeText: { color: '#059669', fontSize: 11, fontWeight: '600' },
  offBadge: { backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  offBadgeText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  itemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 110 },
  // 완료는 완료 뱃지(doneBadgeText)와 같은 emerald, 수정은 "추가" 버튼과 같은
  // indigo, 삭제는 빨간색 — 끄기/켜기만 기존 중립 회색 유지
  completeButton: { backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  completeButtonText: { color: 'white', fontWeight: '600', fontSize: 12 },
  editButton: { backgroundColor: '#4338ca', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  editButtonText: { color: 'white', fontWeight: '600', fontSize: 12 },
  deleteButton: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  deleteButtonText: { color: 'white', fontWeight: '600', fontSize: 12 },
  toggleButton: { backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  toggleButtonText: { color: '#374151', fontWeight: '600', fontSize: 12 },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  smallButton: {
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
