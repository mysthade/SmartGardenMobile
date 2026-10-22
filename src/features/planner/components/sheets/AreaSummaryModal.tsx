import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart, X } from 'lucide-react-native';
import {
  getEffectiveBoundary,
  getPolygonSignedArea,
} from '@smart-garden/validation';
import { useGardenPlannerStore } from '../../store/use-planner-store';

interface AreaSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const AreaSummaryModal = React.memo(function AreaSummaryModal({
  visible,
  onClose,
  isDark,
}: AreaSummaryModalProps) {
  const insets = useSafeAreaInsets();
  const plan = useGardenPlannerStore((s) => s.plan);
  const objects = useGardenPlannerStore((s) => s.objects);
  const objectIds = useGardenPlannerStore((s) => s.objectIds);

  const {
    totalAreaM2,
    totalAreaSotok,
    buildingsAreaM2,
    plantsAreaM2,
    pathsAreaM2,
    freeAreaM2,
    buildingsPct,
    plantsPct,
    pathsPct,
    freePct,
  } = useMemo(() => {
    const boundary = getEffectiveBoundary(plan);
    const totalAreaCm2 = Math.abs(getPolygonSignedArea(boundary));
    const totalM2 = Math.max(1, totalAreaCm2 / 10000);

    let bM2 = 0;
    let plM2 = 0;
    let paM2 = 0;

    for (const id of objectIds) {
      const obj = objects[id];
      if (!obj || obj.deleted) continue;

      let objAreaCm2 = 0;
      if (
        obj.type === 'TREE' ||
        obj.type === 'BUSH' ||
        obj.type === 'WELL' ||
        obj.type === 'BOREHOLE'
      ) {
        const r = Math.min(obj.widthCm, obj.heightCm) / 2;
        objAreaCm2 = Math.PI * r * r;
      } else {
        objAreaCm2 = obj.widthCm * obj.heightCm;
      }

      const objM2 = objAreaCm2 / 10000;
      if (obj.layer === 'BUILDINGS') {
        bM2 += objM2;
      } else if (obj.layer === 'PLANTS') {
        plM2 += objM2;
      } else if (obj.layer === 'PATHS') {
        paM2 += objM2;
      }
    }

    const freeM2 = Math.max(0, totalM2 - (bM2 + plM2 + paM2));

    return {
      totalAreaM2: totalM2.toFixed(1),
      totalAreaSotok: (totalM2 / 100).toFixed(2),
      buildingsAreaM2: bM2.toFixed(1),
      plantsAreaM2: plM2.toFixed(1),
      pathsAreaM2: paM2.toFixed(1),
      freeAreaM2: freeM2.toFixed(1),
      buildingsPct: Math.min(100, Math.round((bM2 / totalM2) * 100)),
      plantsPct: Math.min(100, Math.round((plM2 / totalM2) * 100)),
      pathsPct: Math.min(100, Math.round((paM2 / totalM2) * 100)),
      freePct: Math.max(0, Math.round((freeM2 / totalM2) * 100)),
    };
  }, [plan, objects, objectIds]);

  const bg = isDark ? '#151f1a' : '#ffffff';
  const text = isDark ? '#eaf2ec' : '#14201a';
  const muted = isDark ? '#8ea497' : '#5f6f66';
  const border = isDark ? '#243228' : '#e2ece2';
  const cardBg = isDark ? '#1e2b24' : '#f6faf6';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: bg, borderColor: border, paddingBottom: Math.max(20, insets.bottom) },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View style={styles.headerTitleWrap}>
              <PieChart size={20} color="#10b981" />
              <Text style={[styles.title, { color: text }]}>Зведення площ території</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Total Area Highlight */}
            <View style={[styles.totalCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.totalLabel, { color: muted }]}>Загальна площа ділянки</Text>
              <Text style={[styles.totalValue, { color: text }]}>
                {totalAreaM2} м² <Text style={styles.sotkiText}>({totalAreaSotok} соток)</Text>
              </Text>
            </View>

            {/* Distribution Bar */}
            <View style={styles.barWrap}>
              <View style={[styles.barSegment, { width: `${buildingsPct}%`, backgroundColor: '#c0653a' }]} />
              <View style={[styles.barSegment, { width: `${plantsPct}%`, backgroundColor: '#16a34a' }]} />
              <View style={[styles.barSegment, { width: `${pathsPct}%`, backgroundColor: '#78716c' }]} />
              <View style={[styles.barSegment, { width: `${freePct}%`, backgroundColor: '#86efac' }]} />
            </View>

            {/* Category breakdown rows */}
            <View style={styles.rowsContainer}>
              {/* Buildings */}
              <View style={[styles.categoryRow, { borderBottomColor: border }]}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.dot, { backgroundColor: '#c0653a' }]} />
                  <Text style={[styles.categoryName, { color: text }]}>Будівлі та споруди</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryValue, { color: text }]}>{buildingsAreaM2} м²</Text>
                  <Text style={[styles.categoryPct, { color: muted }]}>{buildingsPct}%</Text>
                </View>
              </View>

              {/* Plants */}
              <View style={[styles.categoryRow, { borderBottomColor: border }]}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.dot, { backgroundColor: '#16a34a' }]} />
                  <Text style={[styles.categoryName, { color: text }]}>Рослини, сад, грядки</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryValue, { color: text }]}>{plantsAreaM2} м²</Text>
                  <Text style={[styles.categoryPct, { color: muted }]}>{plantsPct}%</Text>
                </View>
              </View>

              {/* Paths */}
              <View style={[styles.categoryRow, { borderBottomColor: border }]}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.dot, { backgroundColor: '#78716c' }]} />
                  <Text style={[styles.categoryName, { color: text }]}>Доріжки та огорожі</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryValue, { color: text }]}>{pathsAreaM2} м²</Text>
                  <Text style={[styles.categoryPct, { color: muted }]}>{pathsPct}%</Text>
                </View>
              </View>

              {/* Free area */}
              <View style={[styles.categoryRow, { borderBottomColor: 'transparent' }]}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.dot, { backgroundColor: '#86efac' }]} />
                  <Text style={[styles.categoryName, { color: text }]}>Вільна площа (газон/земля)</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryValue, { color: text }]}>{freeAreaM2} м²</Text>
                  <Text style={[styles.categoryPct, { color: muted }]}>{freePct}%</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 18,
  },
  totalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  sotkiText: {
    fontSize: 14,
    fontWeight: '600',
  },
  barWrap: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 18,
  },
  barSegment: {
    height: '100%',
  },
  rowsContainer: {
    gap: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryPct: {
    fontSize: 12,
    width: 34,
    textAlign: 'right',
  },
});
