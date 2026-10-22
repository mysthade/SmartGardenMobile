import React, { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Compass,
  Edit3,
  Eye,
  Layers,
  RotateCcw,
} from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import type { CameraPreset } from '../../types';

interface CameraPresetBarProps {
  onApplyPreset: (preset: CameraPreset) => void;
  onResetCamera: () => void;
  onEditIn2D: () => void;
  hasSelection: boolean;
  theme: ThemeTokens;
}

interface PresetOption {
  key: CameraPreset;
  label: string;
  icon?: typeof Eye;
  desc: string;
}

const PRESETS: PresetOption[] = [
  { key: 'top', label: 'Зверху', icon: Eye, desc: 'Вигляд зверху (ортогональний)' },
  { key: 'isometric', label: 'Ізометрія', icon: Layers, desc: 'Ізометричний 3D ракурс' },
  { key: 'perspective', label: 'Перспектива', desc: 'Перспективний огляд' },
  { key: 'ground', label: 'З землі', desc: 'Огляд на рівні очей' },
  { key: 'north', label: 'Пн', icon: Compass, desc: 'Вигляд з півночі' },
  { key: 'east', label: 'Сх', desc: 'Вигляд зі сходу' },
  { key: 'south', label: 'Пд', desc: 'Вигляд з півдня' },
  { key: 'west', label: 'Зх', desc: 'Вигляд із заходу' },
];

export const CameraPresetBar = React.memo(function CameraPresetBar({
  onApplyPreset,
  onResetCamera,
  onEditIn2D,
  hasSelection,
  theme,
}: CameraPresetBarProps) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.pn,
            borderColor: theme.bd,
          },
        ]}
      >
        {/* Scrollable Presets Section */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Edit in 2D button if object selected */}
          {hasSelection && (
            <Pressable
              accessibilityLabel="Редагувати вибраний об'єкт у 2D"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={({ pressed }) => [
                styles.editBtn,
                {
                  backgroundColor: theme.ac,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={onEditIn2D}
            >
              <Edit3 size={15} color="#fff" />
              <Text style={styles.editBtnText}>В 2D</Text>
            </Pressable>
          )}

          {PRESETS.map((p) => {
            const IconComp = p.icon;
            return (
              <Pressable
                key={p.key}
                accessibilityLabel={p.desc}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={({ pressed }) => [
                  styles.presetBtn,
                  {
                    backgroundColor: theme.bg,
                    borderColor: theme.bd,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => onApplyPreset(p.key)}
              >
                {IconComp && <IconComp size={14} color={theme.tx} />}
                <Text style={[styles.presetBtnText, { color: theme.tx }]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Vertical Divider */}
        <View style={[styles.divider, { backgroundColor: theme.bd }]} />

        {/* Pinned Reset Camera Button (Always visible on any screen width) */}
        <Pressable
          accessibilityLabel="Скинути ракурс камери (Північ угорі)"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
          style={({ pressed }) => [
            styles.resetBtn,
            {
              backgroundColor: theme.bg,
              borderColor: theme.bd,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={onResetCamera}
        >
          <RotateCcw size={15} color={theme.tx} />
          <Text style={[styles.resetBtnText, { color: theme.tx }]}>Скинути</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 19,
    borderWidth: 1,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 19,
    borderWidth: 1,
    marginLeft: 2,
    marginRight: 2,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
