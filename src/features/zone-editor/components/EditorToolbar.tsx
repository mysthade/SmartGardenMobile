import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Copy,
  Grid3x3,
  Magnet,
  Maximize,
  Minus,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react-native';
import type { ZoneType } from '@smart-garden/types';
import { ZONE_TYPE_LABEL } from '@/src/lib/zone-labels';
import type { SaveStatus } from '../store';

type Props = {
  zoneName: string;
  zoneType: ZoneType;
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: () => void;
  theme: { bg: string; pn: string; tx: string; mu: string; bd: string; ac: string; danger: string };
};

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: 'Усі зміни збережено',
  dirty: 'Незбережені зміни',
  saving: 'Збереження…',
  saved: 'Усі зміни збережено',
  error: 'Помилка збереження',
};

const STATUS_COLOR: Record<SaveStatus, string> = {
  idle: '#2f8f57',
  dirty: '#dc9b2b',
  saving: '#2980b9',
  saved: '#2f8f57',
  error: '#d64545',
};

export function EditorToolbar(props: Props) {
  const { theme } = props;

  return (
    <View>
      <View style={[styles.bar, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <Pressable hitSlop={8} onPress={props.onBack} style={styles.iconBtn}>
          <X size={20} color={theme.tx} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.tx }]}>
            {props.zoneName}
          </Text>
          <View style={styles.subRow}>
            <View style={[styles.badge, { backgroundColor: theme.bd }]}>
              <Text style={[styles.badgeText, { color: theme.tx }]}>
                {ZONE_TYPE_LABEL[props.zoneType] ?? props.zoneType}
              </Text>
            </View>
            <Text style={[styles.status, { color: STATUS_COLOR[props.saveStatus] }]}>
              {STATUS_TEXT[props.saveStatus]}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actions}>
          <ToolBtn icon={<Undo2 size={18} color={props.canUndo ? theme.tx : theme.mu} />} disabled={!props.canUndo} onPress={props.onUndo} />
          <ToolBtn icon={<Redo2 size={18} color={props.canRedo ? theme.tx : theme.mu} />} disabled={!props.canRedo} onPress={props.onRedo} />
          <ToolBtn icon={<Minus size={18} color={theme.tx} />} onPress={props.onZoomOut} />
          <ToolBtn icon={<Plus size={18} color={theme.tx} />} onPress={props.onZoomIn} />
          <ToolBtn icon={<Maximize size={18} color={theme.tx} />} onPress={props.onFit} />
          <ToolBtn
            icon={<Grid3x3 size={18} color={props.showGrid ? theme.ac : theme.mu} />}
            onPress={props.onToggleGrid}
          />
          <ToolBtn
            icon={<Magnet size={18} color={props.snapToGrid ? theme.ac : theme.mu} />}
            onPress={props.onToggleSnap}
          />
          <ToolBtn
            icon={<Copy size={18} color={props.hasSelection ? theme.tx : theme.mu} />}
            disabled={!props.hasSelection}
            onPress={props.onDuplicate}
          />
          <ToolBtn
            icon={<Trash2 size={18} color={props.hasSelection ? theme.danger : theme.mu} />}
            disabled={!props.hasSelection}
            onPress={props.onDelete}
          />
        </ScrollView>

        <Pressable
          onPress={props.onSave}
          style={[styles.saveBtn, { backgroundColor: theme.ac }]}
        >
          <Save size={16} color="#fff" />
          <Text style={styles.saveText}>Зберегти</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ToolBtn({
  icon,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.toolBtn} hitSlop={6}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  iconBtn: { padding: 4 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '800' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  status: { fontSize: 10, fontWeight: '600' },
  actions: { flexGrow: 0, maxWidth: 150 },
  toolBtn: { padding: 5 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
