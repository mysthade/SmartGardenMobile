import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sprout, Trash2, X } from 'lucide-react-native';
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
  const deleteSelected = useZoneEditorStore((s) => s.deleteSelected);

  return (
    <Modal visible={Boolean(plant)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Sprout size={20} color={theme.ac} />
            <Text style={[styles.title, { color: theme.tx }]}>
              {plant?.name ?? 'Рослина'}
            </Text>
          </View>
          <Pressable hitSlop={10} onPress={onClose}>
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
                label="Координати, м"
                value={`${plant.positionX.toFixed(2)} × ${plant.positionY.toFixed(2)}`}
                theme={theme}
              />
              <Meta
                label="Посаджено"
                value={plant.plantedAt ? new Date(plant.plantedAt).toLocaleDateString('uk-UA') : '—'}
                theme={theme}
              />
            </View>

            <View style={styles.actions}>
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
                <Text style={[styles.btnText, { color: theme.danger }]}>Видалити</Text>
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
      <Text style={[styles.metaLabel, { color: theme.mu }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: theme.tx }]}>{value}</Text>
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
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 17, fontWeight: '800', flex: 1 },
  hint: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  meta: { gap: 8, marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  btnText: { fontSize: 14, fontWeight: '700' },
});
