import { memo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { PlantTypeDto } from '@smart-garden/types';
import { STATUS_MAP } from '../../lib/gardens-helpers';

type Theme = {
  pn: string;
  bd: string;
  tx: string;
  mu: string;
  bg: string;
  ac: string;
};

type AddPlantModalProps = {
  open: boolean;
  plantTypeId: string;
  plantName: string;
  plantVariety: string;
  plantQuantity: string;
  plantStatus: string;
  plantTypes: PlantTypeDto[];
  loading: boolean;
  theme: Theme;
  onChangePlantTypeId: (id: string, defaultName?: string) => void;
  onChangePlantName: (v: string) => void;
  onChangePlantVariety: (v: string) => void;
  onChangePlantQuantity: (v: string) => void;
  onChangePlantStatus: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function AddPlantModalInner({
  open,
  plantTypeId,
  plantName,
  plantVariety,
  plantQuantity,
  plantStatus,
  plantTypes,
  loading,
  theme,
  onChangePlantTypeId,
  onChangePlantName,
  onChangePlantVariety,
  onChangePlantQuantity,
  onChangePlantStatus,
  onSubmit,
  onClose,
}: AddPlantModalProps) {
  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.tx }]}>Посадити нову рослину</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <X size={20} color={theme.mu} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Оберіть культуру</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.typesRow}>
                {plantTypes.slice(0, 15).map((pt) => {
                  const isSelected = plantTypeId === pt.id;
                  return (
                    <Pressable
                      key={pt.id}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected ? theme.ac : theme.bg,
                          borderColor: isSelected ? theme.ac : theme.bd,
                        },
                      ]}
                      onPress={() => onChangePlantTypeId(pt.id, pt.name)}
                    >
                      <Text style={[styles.typeChipText, { color: isSelected ? '#fff' : theme.tx }]}>
                        {pt.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Назва рослини *</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={plantName}
              onChangeText={onChangePlantName}
              placeholder="напр. Томат Чері"
              placeholderTextColor={theme.mu}
            />

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Сорт / різновид</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={plantVariety}
              onChangeText={onChangePlantVariety}
              placeholder="напр. Сливка рожева"
              placeholderTextColor={theme.mu}
            />

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Кількість саджанців</Text>
            <TextInput
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
              value={plantQuantity}
              onChangeText={onChangePlantQuantity}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={theme.mu}
            />

            <Text style={[styles.fieldLabel, { color: theme.mu }]}>Статус</Text>
            <View style={styles.statusChipsRow}>
              {['PLANTED', 'GROWING', 'FRUITING'].map((st) => (
                <Pressable
                  key={st}
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: plantStatus === st ? theme.ac : theme.bg,
                      borderColor: plantStatus === st ? theme.ac : theme.bd,
                    },
                  ]}
                  onPress={() => onChangePlantStatus(st)}
                >
                  <Text style={{ color: plantStatus === st ? '#fff' : theme.tx, fontSize: 12, fontWeight: '600' }}>
                    {STATUS_MAP[st]?.label ?? st}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Pressable
            style={[styles.submitModalBtn, { backgroundColor: theme.ac, opacity: !plantName.trim() ? 0.6 : 1 }]}
            disabled={!plantName.trim() || loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitModalBtnText}>Посадити в грядку</Text>
            )}
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
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  typesRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  statusChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  submitModalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export const AddPlantModal = memo(AddPlantModalInner);
