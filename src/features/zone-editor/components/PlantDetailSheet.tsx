import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, FileText, Sprout, Trash2, X } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { CatalogTheme } from './PlantCatalogSheet';
import type { CanvasPlant } from '../store';
import { useZoneEditorStore } from '../store';

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Заплановано',
  PLANTED: 'Посаджено',
  GROWING: 'Росте',
  FLOWERING: 'Цвіте',
  FRUITING: 'Плодоносить',
  HARVESTING: 'Збір урожаю',
  FINISHED: 'Завершено',
  HAS_PROBLEM: 'Є проблема',
};

type Props = {
  plant: CanvasPlant | null;
  onClose: () => void;
  theme: CatalogTheme;
};

export function PlantDetailSheet({ plant, onClose, theme }: Props) {
  const router = useRouter();
  const deleteSelected = useZoneEditorStore((s) => s.deleteSelected);
  const commitPlantPosition = useZoneEditorStore((s) => s.commitPlantPosition);
  const gridStepM = useZoneEditorStore((s) => s.gridStepM);

  const handleNudge = (dx: number, dy: number) => {
    if (!plant) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    commitPlantPosition(plant.id, plant.positionX + dx, plant.positionY + dy);
  };

  return (
    <Modal visible={Boolean(plant)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Sprout size={20} color={theme.ac} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.3}
              style={[styles.title, { color: theme.tx }]}
            >
              {plant?.name ?? 'Рослина'}
            </Text>
          </View>
          <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={theme.mu} />
          </Pressable>
        </View>

        {!plant ? (
          <Text style={[styles.hint, { color: theme.mu }]}>Оберіть рослину на схемі</Text>
        ) : (
          <>
            <View style={styles.meta}>
              <Meta label="Тип" value={plant.plantType?.name ?? '—'} theme={theme} />
              <Meta
                label="Статус"
                value={STATUS_LABEL[plant.status] ?? plant.status}
                theme={theme}
              />
              <Meta
                label="Позиція (X × Y)"
                value={
                  Number.isFinite(plant.positionX) && Number.isFinite(plant.positionY)
                    ? `${plant.positionX.toFixed(2)} м × ${plant.positionY.toFixed(2)} м`
                    : 'Не вказано'
                }
                theme={theme}
              />
              <Meta
                label="Діаметр"
                value={`${(Number.isFinite(plant.size) && plant.size > 0 ? plant.size : 0.4).toFixed(2)} м`}
                theme={theme}
              />
              <Meta
                label="Посаджено"
                value={plant.plantedAt ? new Date(plant.plantedAt).toLocaleDateString('uk-UA') : '—'}
                theme={theme}
              />
            </View>

            {/* Блок точного зсуву стрілками ← ↑ ↓ → (крок сітки) */}
            <View style={[styles.nudgeBox, { backgroundColor: theme.bg, borderColor: theme.bd }]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.nudgeLabel, { color: theme.mu }]}>
                Точний зсув (крок {gridStepM} м):
              </Text>
              <View style={styles.dpad}>
                <Pressable
                  accessibilityLabel="Зсунути вгору"
                  onPress={() => handleNudge(0, -gridStepM)}
                  style={[styles.nudgeBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                  hitSlop={8}
                >
                  <ArrowUp size={20} color={theme.tx} />
                </Pressable>
                <View style={styles.dpadRow}>
                  <Pressable
                    accessibilityLabel="Зсунути вліво"
                    onPress={() => handleNudge(-gridStepM, 0)}
                    style={[styles.nudgeBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                    hitSlop={8}
                  >
                    <ArrowLeft size={20} color={theme.tx} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Зсунути вниз"
                    onPress={() => handleNudge(0, gridStepM)}
                    style={[styles.nudgeBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                    hitSlop={8}
                  >
                    <ArrowDown size={20} color={theme.tx} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Зсунути вправо"
                    onPress={() => handleNudge(gridStepM, 0)}
                    style={[styles.nudgeBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                    hitSlop={8}
                  >
                    <ArrowRight size={20} color={theme.tx} />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  onClose();
                  router.push(`/plants/${plant.id}` as Href);
                }}
                style={[styles.btn, { borderColor: theme.ac, backgroundColor: theme.ac }]}
              >
                <FileText size={16} color="#ffffff" />
                <Text maxFontSizeMultiplier={1.3} style={[styles.btnText, { color: '#ffffff' }]}>
                  Відкрити картку
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert('Видалити рослину?', `«${plant.name}» буде прибрано зі схеми.`, [
                    { text: 'Скасувати', style: 'cancel' },
                    {
                      text: 'Видалити',
                      style: 'destructive',
                      onPress: () => {
                        deleteSelected();
                        onClose();
                      },
                    },
                  ]);
                }}
                style={[styles.btn, { borderColor: theme.danger }]}
              >
                <Trash2 size={16} color={theme.danger} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.btnText, { color: theme.danger }]}>
                  Видалити
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function Meta({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: CatalogTheme;
}) {
  return (
    <View style={styles.metaRow}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.metaLabel, { color: theme.mu }]}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.metaValue, { color: theme.tx }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 17, fontWeight: '800', flex: 1 },
  closeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  meta: { gap: 6, marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 13, fontWeight: '700' },
  nudgeBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  nudgeLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  dpad: { alignItems: 'center', gap: 6 },
  dpadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  btnText: { fontSize: 14, fontWeight: '700' },
});
