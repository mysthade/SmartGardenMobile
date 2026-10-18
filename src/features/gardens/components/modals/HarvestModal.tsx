import { memo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

type Theme = {
  pn: string;
  bd: string;
  tx: string;
  mu: string;
  bg: string;
};

type HarvestModalProps = {
  plant: { id: string; name: string } | null;
  qty: string;
  unit: 'GRAM' | 'PIECE' | 'LITER';
  notes: string;
  loading: boolean;
  theme: Theme;
  onChangeQty: (v: string) => void;
  onChangeUnit: (u: 'GRAM' | 'PIECE' | 'LITER') => void;
  onChangeNotes: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function HarvestModalInner({
  plant,
  qty,
  unit,
  notes,
  loading,
  theme,
  onChangeQty,
  onChangeUnit,
  onChangeNotes,
  onSubmit,
  onClose,
}: HarvestModalProps) {
  if (!plant) return null;

  return (
    <Modal visible={Boolean(plant)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.tx }]}>
              Зафіксувати урожай: {plant.name}
            </Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <X size={20} color={theme.mu} />
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Кількість *</Text>
          <TextInput
            style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            value={qty}
            onChangeText={onChangeQty}
            keyboardType="numeric"
            placeholder="напр. 5"
            placeholderTextColor={theme.mu}
          />

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Одиниця виміру</Text>
          <View style={styles.statusChipsRow}>
            {(
              [
                { val: 'PIECE', label: 'Штук' },
                { val: 'GRAM', label: 'Грам' },
                { val: 'LITER', label: 'Літрів' },
              ] as const
            ).map((u) => (
              <Pressable
                key={u.val}
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: unit === u.val ? '#D35400' : theme.bg,
                    borderColor: unit === u.val ? '#D35400' : theme.bd,
                  },
                ]}
                onPress={() => onChangeUnit(u.val)}
              >
                <Text
                  style={{
                    color: unit === u.val ? '#fff' : theme.tx,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {u.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Нотатка про якість</Text>
          <TextInput
            style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="Стиглі, солодкі плоди"
            placeholderTextColor={theme.mu}
          />

          <Pressable
            style={[
              styles.submitModalBtn,
              { backgroundColor: '#D35400', opacity: !qty.trim() ? 0.6 : 1 },
            ]}
            disabled={!qty.trim() || loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitModalBtnText}>Зберегти запис урожаю</Text>
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

export const HarvestModal = memo(HarvestModalInner);
