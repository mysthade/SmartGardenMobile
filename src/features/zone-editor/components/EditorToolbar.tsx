import { memo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Copy,
  Grid3x3,
  Magnet,
  Maximize,
  Minus,
  Plus,
  Redo2,
  RotateCcw,
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

const STATUS_COLOR: Record<SaveStatus, string> = {
  idle: '#2f8f57',
  dirty: '#dc9b2b',
  saving: '#2980b9',
  saved: '#2f8f57',
  error: '#d64545',
};

function EditorToolbarInner(props: Props) {
  const { theme } = props;

  return (
    <View style={[styles.root, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
      {/* Верхній рядок: Закрити, назва + бейдж типу, компактна крапка статусу, «Зберегти» */}
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel="Закрити редактор"
          hitSlop={8}
          onPress={props.onBack}
          style={styles.iconBtn}
        >
          <X size={22} color={theme.tx} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.3}
            style={[styles.title, { color: theme.tx }]}
          >
            {props.zoneName}
          </Text>
          <View style={styles.subRow}>
            <View style={[styles.badge, { backgroundColor: theme.bd }]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.badgeText, { color: theme.tx }]}>
                {ZONE_TYPE_LABEL[props.zoneType] ?? props.zoneType}
              </Text>
            </View>
            {/* Компактна крапка статусу замість довгого тексту */}
            <View style={styles.statusIndicator}>
              {props.saveStatus === 'saving' ? (
                <ActivityIndicator size={10} color="#2980b9" />
              ) : (
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLOR[props.saveStatus] },
                  ]}
                />
              )}
              {props.saveStatus === 'error' ? (
                <Pressable
                  hitSlop={6}
                  onPress={props.onSave}
                  style={styles.retryChip}
                >
                  <RotateCcw size={10} color="#d64545" />
                  <Text maxFontSizeMultiplier={1.3} style={styles.retryText}>
                    Повторити
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Зберегти схему"
          onPress={props.onSave}
          style={[
            styles.saveBtn,
            {
              backgroundColor: props.saveStatus === 'dirty' ? theme.ac : theme.bd,
              opacity: props.saveStatus === 'saving' ? 0.7 : 1,
            },
          ]}
        >
          <Save size={16} color={props.saveStatus === 'dirty' ? '#fff' : theme.tx} />
          <Text
            maxFontSizeMultiplier={1.3}
            style={[
              styles.saveText,
              { color: props.saveStatus === 'dirty' ? '#fff' : theme.tx },
            ]}
          >
            {props.saveStatus === 'saving' ? '…' : 'Зберегти'}
          </Text>
        </Pressable>
      </View>

      {/* Нижній рядок: горизонтальний скрол інструментів (≥ 44×44 dp) */}
      <View style={[styles.bottomRow, { borderTopColor: theme.bd }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsContent}
        >
          <ToolBtn
            label="Назад (скасувати)"
            icon={<Undo2 size={19} color={props.canUndo ? theme.tx : theme.mu} />}
            disabled={!props.canUndo}
            onPress={props.onUndo}
            theme={theme}
          />
          <ToolBtn
            label="Вперед (повторити)"
            icon={<Redo2 size={19} color={props.canRedo ? theme.tx : theme.mu} />}
            disabled={!props.canRedo}
            onPress={props.onRedo}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.bd }]} />
          <ToolBtn
            label="Зменшити масштаб"
            icon={<Minus size={19} color={theme.tx} />}
            onPress={props.onZoomOut}
            theme={theme}
          />
          <ToolBtn
            label="Збільшити масштаб"
            icon={<Plus size={19} color={theme.tx} />}
            onPress={props.onZoomIn}
            theme={theme}
          />
          <ToolBtn
            label="Вписати в екран"
            icon={<Maximize size={19} color={theme.tx} />}
            onPress={props.onFit}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.bd }]} />
          <ToolBtn
            label="Сітка"
            icon={<Grid3x3 size={19} color={props.showGrid ? theme.ac : theme.mu} />}
            active={props.showGrid}
            onPress={props.onToggleGrid}
            theme={theme}
          />
          <ToolBtn
            label="Прив'язка до сітки"
            icon={<Magnet size={19} color={props.snapToGrid ? theme.ac : theme.mu} />}
            active={props.snapToGrid}
            onPress={props.onToggleSnap}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.bd }]} />
          <ToolBtn
            label="Дублювати рослину"
            icon={<Copy size={19} color={props.hasSelection ? theme.tx : theme.mu} />}
            disabled={!props.hasSelection}
            onPress={props.onDuplicate}
            theme={theme}
          />
          <ToolBtn
            label="Видалити рослину"
            icon={<Trash2 size={19} color={props.hasSelection ? theme.danger : theme.mu} />}
            disabled={!props.hasSelection}
            onPress={props.onDelete}
            theme={theme}
          />
        </ScrollView>
      </View>
    </View>
  );
}

function ToolBtn({
  icon,
  onPress,
  disabled,
  active,
  label,
  theme,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  theme: { bd: string; ac: string };
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.toolBtn,
        active && [styles.toolBtnActive, { borderColor: theme.ac }],
      ]}
      hitSlop={4}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    minHeight: 52,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  retryText: {
    fontSize: 10,
    color: '#d64545',
    fontWeight: '700',
  },
  saveBtn: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bottomRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  toolBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toolBtnActive: {
    borderWidth: 1,
  },
  separator: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
});

export const EditorToolbar = memo(EditorToolbarInner);
