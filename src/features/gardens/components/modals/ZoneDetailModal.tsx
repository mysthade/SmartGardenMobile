import { memo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Droplets, Move, Plus, Sprout, Trash2, Wheat, X } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import type { PlantDto, ZoneDto } from '@smart-garden/types';
import { STATUS_MAP, ZONE_TYPE_LABEL } from '../../lib/gardens-helpers';

type Theme = {
  name: string;
  pn: string;
  bd: string;
  tx: string;
  mu: string;
  bg: string;
  ac: string;
};

type ZoneDetailModalProps = {
  zone: ZoneDto | null;
  plants: PlantDto[];
  theme: Theme;
  onOpenEditor: (zoneId: string) => void;
  onAddPlant: (zoneId: string) => void;
  onCarePlant: (plant: { id: string; name: string }) => void;
  onHarvestPlant: (plant: { id: string; name: string }) => void;
  onDeletePlant: (plantId: string, plantName: string) => void;
  onClose: () => void;
};

function ZoneDetailModalInner({
  zone,
  plants,
  theme,
  onOpenEditor,
  onAddPlant,
  onCarePlant,
  onHarvestPlant,
  onDeletePlant,
  onClose,
}: ZoneDetailModalProps) {
  const router = useRouter();
  if (!zone) return null;

  return (
    <Modal visible={Boolean(zone)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: theme.pn, borderColor: theme.bd, maxHeight: '90%' },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sprout size={20} color={theme.ac} />
                <Text style={[styles.modalTitle, { color: theme.tx }]}>
                  {zone.name ?? 'Зона'}
                </Text>
              </View>
              <Text style={[styles.muted, { color: theme.mu, marginTop: 2, fontSize: 12 }]}>
                {zone.type ? `Тип: ${ZONE_TYPE_LABEL[zone.type] ?? zone.type}` : 'Грядка'}
                {zone.area ? ` • Площа: ${zone.area} м²` : ''}
                {zone.width && zone.height ? ` • ${zone.width} × ${zone.height} м` : ''}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose}>
              <X size={20} color={theme.mu} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <Pressable
                style={[
                  styles.smallAddPlantBtn,
                  {
                    flex: 1,
                    backgroundColor: theme.ac,
                    borderColor: theme.ac,
                    paddingVertical: 10,
                    justifyContent: 'center',
                  },
                ]}
                onPress={() => onOpenEditor(zone.id)}
              >
                <Move size={16} color="#fff" />
                <Text style={[styles.smallAddPlantText, { color: '#fff', fontWeight: '700' }]}>
                  Редактор зони
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.smallAddPlantBtn,
                  {
                    flex: 1,
                    backgroundColor: theme.ac,
                    borderColor: theme.ac,
                    paddingVertical: 10,
                    justifyContent: 'center',
                  },
                ]}
                onPress={() => onAddPlant(zone.id)}
              >
                <Plus size={16} color="#fff" />
                <Text style={[styles.smallAddPlantText, { color: '#fff', fontWeight: '700' }]}>
                  Посадити нову рослину
                </Text>
              </Pressable>
            </View>

            <Text
              style={[styles.fieldLabel, { color: theme.tx, fontWeight: '700', marginBottom: 8 }]}
            >
              Рослини у цій зоні ({plants.length}):
            </Text>

            {plants.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.bg, borderColor: theme.bd, paddingVertical: 24 },
                ]}
              >
                <Sprout size={32} color={theme.mu} />
                <Text style={[styles.muted, { color: theme.mu, marginTop: 6 }]}>
                  У цій зоні ще немає висаджених рослин
                </Text>
              </View>
            ) : (
              plants.map((plant) => {
                const st = STATUS_MAP[plant.status] ?? STATUS_MAP.GROWING;
                return (
                  <View
                    key={plant.id}
                    style={[
                      styles.plantCard,
                      {
                        backgroundColor: theme.name === 'dark' ? '#17251c' : '#f9fcf9',
                        borderColor: theme.bd,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <Pressable
                      style={styles.plantTopRow}
                      onPress={() => {
                        onClose();
                        router.push(`/plants/${plant.id}` as Href);
                      }}
                      accessibilityLabel={`Відкрити картку ${plant.name}`}
                    >
                      <View style={styles.plantTitleWrap}>
                        <Text style={[styles.plantNameText, { color: theme.tx }]}>
                          {plant.name}
                        </Text>
                        {plant.variety ? (
                          <Text style={[styles.plantVarietyText, { color: theme.mu }]}>
                            Сорт: {plant.variety}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: st.color }]}>
                          {st.label}
                        </Text>
                      </View>
                    </Pressable>

                    <View style={styles.plantMetaRow}>
                      <Text style={[styles.plantQty, { color: theme.mu }]}>
                        Кількість: {plant.quantity ?? 1} шт.
                      </Text>
                    </View>

                    <View style={[styles.plantButtonsRow, { borderTopColor: theme.bd }]}>
                      <Pressable
                        style={styles.pActionBtn}
                        onPress={() => onHarvestPlant({ id: plant.id, name: plant.name })}
                      >
                        <Wheat size={14} color="#D35400" />
                        <Text style={[styles.pActionText, { color: '#D35400' }]}>Урожай</Text>
                      </Pressable>

                      <Pressable
                        style={styles.pActionBtn}
                        onPress={() => onCarePlant({ id: plant.id, name: plant.name })}
                      >
                        <Droplets size={14} color="#2980B9" />
                        <Text style={[styles.pActionText, { color: '#2980B9' }]}>Догляд</Text>
                      </Pressable>

                      <Pressable
                        style={styles.pActionBtn}
                        onPress={() => onDeletePlant(plant.id, plant.name)}
                      >
                        <Trash2 size={14} color="#C0392B" />
                        <Text style={[styles.pActionText, { color: '#C0392B' }]}>Видалити</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <Pressable
            style={[
              styles.submitModalBtn,
              {
                backgroundColor: theme.pn,
                borderColor: theme.bd,
                borderWidth: 1,
                marginTop: 12,
              },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.submitModalBtnText, { color: theme.tx }]}>Закрити</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  muted: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  smallAddPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smallAddPlantText: { fontSize: 12, fontWeight: '700' },
  emptyCard: {
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  plantCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  plantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  plantTitleWrap: { flex: 1 },
  plantNameText: { fontSize: 15, fontWeight: '700' },
  plantVarietyText: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  plantMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plantQty: { fontSize: 12 },
  plantButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    justifyContent: 'space-around',
  },
  pActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pActionText: { fontSize: 12, fontWeight: '600' },
  submitModalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export const ZoneDetailModal = memo(ZoneDetailModalInner);
