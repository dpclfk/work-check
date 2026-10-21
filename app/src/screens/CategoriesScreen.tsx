import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MainCategory, SubCategory } from '../api/categories';
import { Dropdown, DropdownOption } from '../components/Dropdown';
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

const NO_MAIN = '__none__';

// 카드 공용 스타일(Tailwind로 못 표현하는 shadow는 인라인 elevation으로 보강)
const CARD_CLASS = 'rounded-[10px] bg-white p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)]';

/** 삭제 전 하위 항목까지 같이 지울지 물어봄 — 3가지 선택지(취소/분리/함께삭제) */
function confirmDelete(target: string, onDeleteTogether: () => void, onDetachOnly: () => void) {
  Alert.alert(`${target} 삭제`, '하위 항목을 어떻게 할까요?', [
    { text: '취소', style: 'cancel' },
    { text: '이 카테고리만 삭제(하위 유지)', onPress: onDetachOnly },
    { text: '하위 항목도 함께 삭제', style: 'destructive', onPress: onDeleteTogether },
  ]);
}

export function CategoriesScreen() {
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
  const [newSubMainId, setNewSubMainId] = useState<string>(NO_MAIN);

  const [editingMainId, setEditingMainId] = useState<number | null>(null);
  const [editingMainName, setEditingMainName] = useState('');
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [editingSubMainId, setEditingSubMainId] = useState<string>(NO_MAIN);
  // 접힌 메인카테고리 그룹의 key 모음(할 일 목록의 접기와 동일한 패턴) — 기본은 전부 펼침
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const error = [
    createMainMutation,
    renameMainMutation,
    removeMainMutation,
    createSubMutation,
    updateSubMutation,
    removeSubMutation,
  ].find((m) => m.isError)?.error;

  const mainOptions: DropdownOption<string>[] = [
    { label: '메인 카테고리 없음', value: NO_MAIN },
    ...mainCategories.map((m) => ({ label: m.name, value: String(m.id) })),
  ];

  const handleCreateMain = () => {
    if (!newMainName.trim()) return;
    createMainMutation.mutate(newMainName.trim(), { onSuccess: () => setNewMainName('') });
  };

  const handleCreateSub = () => {
    if (!newSubName.trim()) return;
    createSubMutation.mutate(
      { name: newSubName.trim(), mainCategoryId: newSubMainId === NO_MAIN ? null : Number(newSubMainId) },
      {
        onSuccess: () => {
          setNewSubName('');
          setNewSubMainId(NO_MAIN);
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

  const handleRemoveMain = (category: MainCategory) => {
    confirmDelete(
      `메인 카테고리 "${category.name}"`,
      () => removeMainMutation.mutate({ id: category.id, deleteSubItems: true }),
      () => removeMainMutation.mutate({ id: category.id, deleteSubItems: false }),
    );
  };

  const startEditSub = (category: SubCategory) => {
    setEditingSubId(category.id);
    setEditingSubName(category.name);
    setEditingSubMainId(category.mainCategoryId != null ? String(category.mainCategoryId) : NO_MAIN);
  };

  const saveEditSub = (id: number) => {
    if (!editingSubName.trim()) return;
    updateSubMutation.mutate(
      {
        id,
        input: {
          name: editingSubName.trim(),
          mainCategoryId: editingSubMainId === NO_MAIN ? null : Number(editingSubMainId),
        },
      },
      { onSuccess: () => setEditingSubId(null) },
    );
  };

  const handleRemoveSub = (category: SubCategory) => {
    confirmDelete(
      `서브 카테고리 "${category.name}"`,
      () => removeSubMutation.mutate({ id: category.id, deleteSubItems: true }),
      () => removeSubMutation.mutate({ id: category.id, deleteSubItems: false }),
    );
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
    <View key={category.id} className={`${CARD_CLASS} ml-4`} style={{ elevation: 1 }}>
      {editingSubId === category.id ? (
        <View style={{ gap: 8 }}>
          <Dropdown value={editingSubMainId} options={mainOptions} onChange={setEditingSubMainId} />
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm"
              value={editingSubName}
              onChangeText={setEditingSubName}
              autoFocus
            />
            <TouchableOpacity
              className="rounded-md bg-emerald-600 px-2.5 py-1.5"
              onPress={() => saveEditSub(category.id)}
            >
              <Text className="text-xs font-semibold text-white">저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-md bg-red-600 px-2.5 py-1.5"
              onPress={() => setEditingSubId(null)}
            >
              <Text className="text-xs font-semibold text-white">취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[15px] text-[#111827]">{category.name}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="rounded-md bg-indigo-700 px-2.5 py-1.5"
              onPress={() => startEditSub(category)}
            >
              <Text className="text-xs font-semibold text-white">수정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-md bg-red-600 px-2.5 py-1.5"
              onPress={() => handleRemoveSub(category)}
            >
              <Text className="text-xs font-semibold text-white">삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-[#f5f6f8]">
        <Text className="p-4 text-[#6b7280]">불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#f5f6f8]" contentContainerClassName="p-4 pb-10">
      <Text className="mb-4 text-[22px] font-bold">카테고리 관리</Text>
      {error && (
        <Text className="mb-2 text-[13px] text-red-600">
          {extractErrorMessage(error, '요청을 처리하지 못했습니다.')}
        </Text>
      )}

      <Text className="mb-2.5 mt-5 text-[15px] font-bold text-[#374151]">메인 카테고리</Text>
      <View className="mb-2.5 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm"
          placeholder="메인 카테고리 이름"
          value={newMainName}
          onChangeText={setNewMainName}
        />
        <TouchableOpacity
          className="justify-center rounded-lg bg-indigo-700 px-4"
          onPress={handleCreateMain}
          disabled={createMainMutation.isPending}
        >
          <Text className="text-sm font-semibold text-white">추가</Text>
        </TouchableOpacity>
      </View>

      {mainCategories.map((category) => (
        <View key={category.id} className={CARD_CLASS} style={{ elevation: 1 }}>
          {editingMainId === category.id ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm"
                value={editingMainName}
                onChangeText={setEditingMainName}
                autoFocus
              />
              <TouchableOpacity
                className="rounded-md bg-emerald-600 px-2.5 py-1.5"
                onPress={() => saveEditMain(category.id)}
              >
                <Text className="text-xs font-semibold text-white">저장</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-md bg-red-600 px-2.5 py-1.5"
                onPress={() => setEditingMainId(null)}
              >
                <Text className="text-xs font-semibold text-white">취소</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-[15px] text-[#111827]">{category.name}</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="rounded-md bg-indigo-700 px-2.5 py-1.5"
                  onPress={() => startEditMain(category)}
                >
                  <Text className="text-xs font-semibold text-white">수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-md bg-red-600 px-2.5 py-1.5"
                  onPress={() => handleRemoveMain(category)}
                >
                  <Text className="text-xs font-semibold text-white">삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ))}
      {mainCategories.length === 0 && (
        <Text className="text-[13px] text-[#6b7280]">등록된 메인 카테고리가 없습니다.</Text>
      )}

      <Text className="mb-2.5 mt-5 text-[15px] font-bold text-[#374151]">서브 카테고리</Text>
      <Dropdown value={newSubMainId} options={mainOptions} onChange={setNewSubMainId} className="mb-2.5" />
      <View className="mb-2.5 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm"
          placeholder="서브 카테고리 이름"
          value={newSubName}
          onChangeText={setNewSubName}
        />
        <TouchableOpacity
          className="justify-center rounded-lg bg-indigo-700 px-4"
          onPress={handleCreateSub}
          disabled={createSubMutation.isPending}
        >
          <Text className="text-sm font-semibold text-white">추가</Text>
        </TouchableOpacity>
      </View>

      {subGroups.map((group) => (
        <View key={group.key}>
          <TouchableOpacity
            className="mb-0.5 mt-1 flex-row items-center gap-1.5"
            onPress={() => toggleGroup(group.key)}
          >
            <Text className="text-[11px] text-[#9ca3af]">{collapsedGroups.has(group.key) ? '▶' : '▼'}</Text>
            <Text className="text-[15px] font-bold text-[#1f2937]">{group.label}</Text>
          </TouchableOpacity>
          {!collapsedGroups.has(group.key) && group.subs.map(renderSubCategory)}
        </View>
      ))}
      {subCategories.length === 0 && (
        <Text className="text-[13px] text-[#6b7280]">등록된 서브 카테고리가 없습니다.</Text>
      )}
    </ScrollView>
  );
}
