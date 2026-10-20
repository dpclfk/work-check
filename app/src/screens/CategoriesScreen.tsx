import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  const mainCategoryName = (id?: number | null) => mainCategories.find((m) => m.id === id)?.name ?? null;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>카테고리 관리</Text>
      {error && <Text style={styles.error}>{extractErrorMessage(error, '요청을 처리하지 못했습니다.')}</Text>}

      <Text style={styles.sectionTitle}>메인 카테고리</Text>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="메인 카테고리 이름"
          value={newMainName}
          onChangeText={setNewMainName}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleCreateMain} disabled={createMainMutation.isPending}>
          <Text style={styles.addButtonText}>추가</Text>
        </TouchableOpacity>
      </View>

      {mainCategories.map((category) => (
        <View key={category.id} style={styles.card}>
          {editingMainId === category.id ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, styles.editInput]}
                value={editingMainName}
                onChangeText={setEditingMainName}
                autoFocus
              />
              <TouchableOpacity style={styles.smallButton} onPress={() => saveEditMain(category.id)}>
                <Text style={styles.smallButtonText}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={() => setEditingMainId(null)}>
                <Text style={styles.smallButtonText}>취소</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardRow}>
              <Text style={styles.cardName}>{category.name}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.smallButton} onPress={() => startEditMain(category)}>
                  <Text style={styles.smallButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={() => handleRemoveMain(category)}>
                  <Text style={styles.smallButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ))}
      {mainCategories.length === 0 && <Text style={styles.empty}>등록된 메인 카테고리가 없습니다.</Text>}

      <Text style={styles.sectionTitle}>서브 카테고리</Text>
      <Dropdown
        value={newSubMainId}
        options={mainOptions}
        onChange={setNewSubMainId}
        style={styles.dropdownSpacing}
      />
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="서브 카테고리 이름"
          value={newSubName}
          onChangeText={setNewSubName}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleCreateSub} disabled={createSubMutation.isPending}>
          <Text style={styles.addButtonText}>추가</Text>
        </TouchableOpacity>
      </View>

      {subCategories.map((category) => (
        <View key={category.id} style={styles.card}>
          {editingSubId === category.id ? (
            <View style={{ gap: 8 }}>
              <Dropdown value={editingSubMainId} options={mainOptions} onChange={setEditingSubMainId} />
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.input, styles.editInput]}
                  value={editingSubName}
                  onChangeText={setEditingSubName}
                  autoFocus
                />
                <TouchableOpacity style={styles.smallButton} onPress={() => saveEditSub(category.id)}>
                  <Text style={styles.smallButtonText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={() => setEditingSubId(null)}>
                  <Text style={styles.smallButtonText}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.cardRow}>
              <View style={styles.cardNameRow}>
                <Text style={styles.cardName}>{category.name}</Text>
                {mainCategoryName(category.mainCategoryId) && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{mainCategoryName(category.mainCategoryId)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.smallButton} onPress={() => startEditSub(category)}>
                  <Text style={styles.smallButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={() => handleRemoveSub(category)}>
                  <Text style={styles.smallButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ))}
      {subCategories.length === 0 && <Text style={styles.empty}>등록된 서브 카테고리가 없습니다.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  content: { padding: 16, paddingBottom: 40 },
  loadingText: { padding: 16, color: '#6b7280' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 10 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownSpacing: { marginBottom: 10 },
  addButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  cardName: { fontSize: 15, color: '#111827' },
  cardActions: { flexDirection: 'row', gap: 8 },
  smallButton: {
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editInput: { flex: 1 },
  badge: { backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#4338ca', fontWeight: '600' },
  empty: { color: '#6b7280', fontSize: 13 },
});
