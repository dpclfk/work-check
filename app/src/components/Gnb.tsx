import { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView className="bg-white">
      <View className="flex-row items-center justify-between border-b border-[#f3f4f6] bg-white px-4 py-2.5">
        <TouchableOpacity className="p-1" onPress={() => setMenuOpen(true)}>
          <Text className="text-[22px] text-[#111827]">☰</Text>
        </TouchableOpacity>

        <View className="max-w-[70%] flex-row items-center gap-2.5">
          <Text className="shrink text-xs text-[#6b7280]" numberOfLines={1}>
            {user?.email}
          </Text>
          <TouchableOpacity onPress={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
            <Text className="text-[13px] font-semibold text-indigo-700">
              {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 bg-black/30" onPress={() => setMenuOpen(false)}>
          <SafeAreaView>
            <View
              className="ml-3 mt-2 w-[180px] rounded-[10px] bg-white py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              style={{ elevation: 4 }}
            >
              {NAV_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.view}
                  className={`mx-1 rounded-lg px-4 py-3 ${activeView === item.view ? 'bg-indigo-50' : ''}`}
                  onPress={() => {
                    onNavigate(item.view);
                    setMenuOpen(false);
                  }}
                >
                  <Text
                    className={`text-[15px] font-semibold ${
                      activeView === item.view ? 'text-indigo-700' : 'text-[#374151]'
                    }`}
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
