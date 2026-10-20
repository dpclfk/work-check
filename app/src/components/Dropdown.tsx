import { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

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
  style?: StyleProp<ViewStyle>;
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
  style,
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
  const listPosition = anchor
    ? openBelow
      ? { top: anchor.y + anchor.height + 4, left: anchor.x, width: anchor.width }
      : { top: Math.max(8, anchor.y - LIST_MAX_HEIGHT - 4), left: anchor.x, width: anchor.width }
    : null;

  return (
    <View style={style}>
      <TouchableOpacity ref={triggerRef} style={styles.trigger} onPress={openDropdown}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label ?? placeholder ?? '선택'}
        </Text>
        <Text style={styles.caret}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          {listPosition && (
            <View style={[styles.list, listPosition]}>
              <ScrollView style={styles.scroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {options.map((opt, i) =>
                  opt.isHeader ? (
                    <Text key={`h-${i}`} style={styles.groupHeader}>
                      {opt.label}
                    </Text>
                  ) : (
                    <TouchableOpacity
                      key={i}
                      style={styles.item}
                      onPress={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                    >
                      <Text style={opt.value === value ? styles.itemActive : styles.itemText}>
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

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerText: { flex: 1, fontSize: 14, color: '#111827' },
  caret: { fontSize: 10, color: '#9ca3af', marginLeft: 6 },
  overlay: { flex: 1 },
  list: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: LIST_MAX_HEIGHT,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  scroll: { maxHeight: LIST_MAX_HEIGHT },
  groupHeader: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemText: { fontSize: 14, color: '#111827' },
  itemActive: { fontSize: 14, color: '#4338ca', fontWeight: '700' },
});
