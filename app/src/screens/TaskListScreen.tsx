import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Task, TaskCycle, tasksApi } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';

const CYCLE_LABEL: Record<TaskCycle, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
  ONCE: '한 번만',
};

interface TaskListScreenProps {
  onOpenSettings: () => void;
}

export function TaskListScreen({ onOpenSettings }: TaskListScreenProps) {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    setRefreshing(true);
    try {
      setTasks(await tasksApi.list());
    } catch (error) {
      console.error('할 일 목록을 불러오지 못했습니다', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleComplete = async (id: number) => {
    await tasksApi.complete(id);
    await loadTasks();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>할 일 체크리스트</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onOpenSettings}>
            <Text style={styles.logoutText}>설정</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(task) => String(task.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTasks} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>등록된 할 일이 없습니다.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {CYCLE_LABEL[item.cycle]} · {item.deadLine}시까지
              </Text>
            </View>
            <TouchableOpacity style={styles.completeButton} onPress={() => handleComplete(item.id)}>
              <Text style={styles.completeButtonText}>완료</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  logoutText: {
    color: '#4338ca',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 32,
  },
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
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  completeButton: {
    backgroundColor: '#4338ca',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
