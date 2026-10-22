import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Compass,
  HelpCircle,
  Maximize2,
  Move,
  Ruler,
  ZoomIn,
} from 'lucide-react-native';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface PlannerControlPanelProps {
  isDark: boolean;
  onFitToScreen?: () => void;
}

export const PlannerControlPanel = React.memo(function PlannerControlPanel({
  isDark,
  onFitToScreen,
}: PlannerControlPanelProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const northAngleDeg = useGardenPlannerStore((s) => s.plan.northAngleDeg);
  const setNorthAngle = useGardenPlannerStore((s) => s.setNorthAngle);
  const viewMode = useGardenPlannerStore((s) => s.viewMode);
  const yawDeg = useGardenPlannerStore((s) => s.camera3D.yawDeg);
  const setCamera3D = useGardenPlannerStore((s) => s.setCamera3D);
  const showRulers = useGardenPlannerStore((s) => s.settings.showRulers);
  const toggleRulers = useGardenPlannerStore((s) => s.toggleRulers);

  const is3D = viewMode === '2.5D' || viewMode === '3D';
  const displayAngle = is3D ? (-yawDeg + northAngleDeg + 360) % 360 : northAngleDeg;

  const handleCompassPress = () => {
    if (is3D) {
      setCamera3D({ yawDeg: 0 });
    } else {
      const nextAngle = (northAngleDeg + 90) % 360;
      setNorthAngle(nextAngle);
    }
  };

  const panelBg = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)';
  const panelBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <>
      <View
        style={[
          styles.floatingStack,
          {
            backgroundColor: panelBg,
            borderColor: panelBorder,
          },
        ]}
      >
        {/* 1. Компас (North) */}
        <Pressable
          style={styles.controlItem}
          onPress={handleCompassPress}
          accessibilityRole="button"
          accessibilityLabel={`Північ: ${Math.round(displayAngle)}°`}
        >
          <View style={{ transform: [{ rotate: `${displayAngle}deg` }] }}>
            <Compass size={20} color="#ef4444" />
          </View>
          <Text style={[styles.microLabel, { color: textColor }]}>Пн</Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* 2. Лінійки CAD (Rulers toggle) */}
        {viewMode === '2D' && (
          <>
            <Pressable
              style={[
                styles.controlItem,
                showRulers && { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.12)' },
              ]}
              onPress={toggleRulers}
              accessibilityRole="button"
              accessibilityLabel={`Лінійки ${showRulers ? 'увімкнено' : 'вимкнено'}`}
            >
              <Ruler size={18} color={showRulers ? '#0ea5e9' : mutedColor} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          </>
        )}

        {/* 3. Центрувати / Показати все (Fit) */}
        {onFitToScreen && viewMode === '2D' && (
          <>
            <Pressable
              style={styles.controlItem}
              onPress={onFitToScreen}
              accessibilityRole="button"
              accessibilityLabel="Показати всю ділянку"
            >
              <Maximize2 size={18} color={mutedColor} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          </>
        )}

        {/* 4. Підказка / Довідка (?) */}
        <Pressable
          style={styles.controlItem}
          onPress={() => setIsHelpOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Підказка жестів і керування"
        >
          <HelpCircle size={18} color={mutedColor} />
        </Pressable>
      </View>

      {/* Help Modal */}
      <Modal
        visible={isHelpOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHelpOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsHelpOpen(false)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {viewMode === '2D' ? 'Швидкі підказки 2D планувальника' : 'Жести керування 3D'}
            </Text>

            {viewMode === '2D' ? (
              <View style={styles.hintList}>
                <View style={styles.hintItem}>
                  <Move size={18} color="#0ea5e9" />
                  <Text style={[styles.hintText, { color: textColor }]}>
                    <Text style={{ fontWeight: 'bold' }}>Перетягування:</Text> торкніться обʼєкта для вибору, перетягуйте пальцем (лупа збільшує зону дотику).
                  </Text>
                </View>

                <View style={styles.hintItem}>
                  <ZoomIn size={18} color="#10b981" />
                  <Text style={[styles.hintText, { color: textColor }]}>
                    <Text style={{ fontWeight: 'bold' }}>Масштаб і панорамування:</Text> щипок двома пальцями для зуму, проведіть для переміщення полотна.
                  </Text>
                </View>

                <View style={styles.hintItem}>
                  <Ruler size={18} color="#f59e0b" />
                  <Text style={[styles.hintText, { color: textColor }]}>
                    <Text style={{ fontWeight: 'bold' }}>Точні розміри:</Text> виберіть обʼєкт для показу стрілок розмірів і відступів до меж і сусідів.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.hintList}>
                <View style={styles.hintItem}>
                  <Move size={18} color="#0ea5e9" />
                  <Text style={[styles.hintText, { color: textColor }]}>
                    <Text style={{ fontWeight: 'bold' }}>Обертання:</Text> один палець обертає камеру навколо центру саду.
                  </Text>
                </View>

                <View style={styles.hintItem}>
                  <ZoomIn size={18} color="#10b981" />
                  <Text style={[styles.hintText, { color: textColor }]}>
                    <Text style={{ fontWeight: 'bold' }}>Зум:</Text> зведення або розведення двох пальців наближає чи віддаляє сцену.
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              style={[styles.closeBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
              onPress={() => setIsHelpOpen(false)}
            >
              <Text style={[styles.closeBtnText, { color: textColor }]}>Зрозуміло</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  floatingStack: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 44,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 40,
  },
  controlItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  divider: {
    width: 28,
    height: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  hintList: {
    gap: 14,
    marginBottom: 20,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
