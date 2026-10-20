import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export interface DropdownOption<T> {
  label: string;
  value: T;
  /** 선택 불가능한 그룹 헤더(예: 서브카테고리 목록에서 메인카테고리 이름 구분용) */
  isHeader?: boolean;
}

interface DropdownProps<T> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}

const LIST_MAX_HEIGHT = 220;

/** 웹의 <select>에 대응하는 공용 드롭다운. 목록을 일반 View로 겹쳐 그리면
 * FlatList 행 안에서는(특히 Android) zIndex/elevation이 "다른 행" 레이어를
 *못 뚫고 가려지는 문제가 있어서, Modal로 그림 — Modal은 항상 별도의
 * 최상위 레이어에 그려지므로 어디에 중첩돼있든 플랫폼 상관없이 항상 맨 위에 뜸.
 * 트리거의 화면상 위치를 measureInWindow로 재서 그 위치에 목록을 띄움 */
export function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  placeholder,
  className,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );
  const triggerRef = useRef<View>(null);
  const selected = options.find((o) => !o.isHeader && o.value === value);

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  // 트리거 아래에 띄우되, 화면 아래쪽에 공간이 부족하면 위로 뒤집어서 띄움
  const screenHeight = Dimensions.get('window').height;
  const openBelow = anchor ? anchor.y + anchor.height + LIST_MAX_HEIGHT + 8 <= screenHeight : true;
  // measureInWindow로 잰 좌표는 매번 달라지는 런타임 값이라 className으로
  // 못 쓰고 계속 인라인 style로 남겨둬야 함(위치 계산 자체는 Tailwind 영역 밖)
  const listPosition = anchor
    ? openBelow
      ? { top: anchor.y + anchor.height + 4, left: anchor.x, width: anchor.width }
      : { top: Math.max(8, anchor.y - LIST_MAX_HEIGHT - 4), left: anchor.x, width: anchor.width }
    : null;

  return (
    <View className={className}>
      <TouchableOpacity
        ref={triggerRef}
        className="flex-row items-center justify-between rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5"
        onPress={openDropdown}
      >
        <Text className="flex-1 text-sm text-[#111827]" numberOfLines={1}>
          {selected?.label ?? placeholder ?? '선택'}
        </Text>
        <Text className="ml-1.5 text-[10px] text-[#9ca3af]">{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          {listPosition && (
            <View
              className="absolute max-h-[220px] rounded-lg border border-[#e5e7eb] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
              style={{ ...listPosition, elevation: 8 }}
            >
              <ScrollView
                className="max-h-[220px]"
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {options.map((opt, i) =>
                  opt.isHeader ? (
                    <Text
                      key={`h-${i}`}
                      className="px-3 pb-1 pt-2 text-[11px] font-bold text-[#9ca3af]"
                    >
                      {opt.label}
                    </Text>
                  ) : (
                    <TouchableOpacity
                      key={i}
                      className="border-b border-[#f3f4f6] px-3 py-2.5"
                      onPress={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                    >
                      <Text
                        className={`text-sm ${
                          opt.value === value ? 'font-bold text-indigo-700' : 'text-[#111827]'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
