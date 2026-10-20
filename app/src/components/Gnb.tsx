import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export type AppView = 'tasks' | 'categories' | 'settings';

const NAV_ITEMS: { view: AppView; label: string }[] = [
  { view: 'tasks', label: '할 일' },
  { view: 'categories', label: '카테고리' },
  { view: 'settings', label: '설정' },
];

interface GnbProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

/** 모든 인증된 화면 위에 고정으로 떠있는 상단 바. 좌상단 햄버거 → 할일/카테고리/설정
 * 탭 메뉴, 우상단에 이메일 + 로그아웃 (web의 Gnb.tsx와 동일한 역할) */
export function Gnb({ activeView, onNavigate }: GnbProps) {
  const { user, logoutMutation } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.bar}>
        <TouchableOpacity style={styles.hamburgerButton} onPress={() => setMenuOpen(true)}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.right}>
          <Text style={styles.email} numberOfLines={1}>
            {user?.email}
          </Text>
          <TouchableOpacity onPress={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
            <Text style={styles.logoutText}>
              {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <SafeAreaView>
            <View style={styles.menu}>
              {NAV_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.view}
                  style={[styles.menuItem, activeView === item.view && styles.menuItemActive]}
                  onPress={() => {
                    onNavigate(item.view);
                    setMenuOpen(false);
                  }}
                >
                  <Text
                    style={[styles.menuItemText, activeView === item.view && styles.menuItemTextActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: 'white' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  hamburgerButton: { padding: 4 },
  hamburgerIcon: { fontSize: 22, color: '#111827' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '70%' },
  email: { fontSize: 12, color: '#6b7280', flexShrink: 1 },
  logoutText: { color: '#4338ca', fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menu: {
    marginTop: 8,
    marginLeft: 12,
    width: 180,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginHorizontal: 4 },
  menuItemActive: { backgroundColor: '#eef2ff' },
  menuItemText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  menuItemTextActive: { color: '#4338ca' },
});
