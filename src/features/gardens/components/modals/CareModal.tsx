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

type CareModalProps = {
  plant: { id: string; name: string } | null;
  type: string;
  notes: string;
  loading: boolean;
  theme: Theme;
  onChangeType: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const CARE_TYPES = [
  { val: 'WATERING', label: 'Полив 💧' },
  { val: 'FERTILIZING', label: 'Добрива 🧪' },
  { val: 'WEEDING', label: 'Прополка 🌿' },
  { val: 'PRUNING', label: 'Обрізка ✂️' },
];

function CareModalInner({
  plant,
  type,
  notes,
  loading,
  theme,
  onChangeType,
  onChangeNotes,
  onSubmit,
  onClose,
}: CareModalProps) {
  if (!plant) return null;

  return (
    <Modal visible={Boolean(plant)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.tx }]}>
              Зафіксувати догляд: {plant.name}
            </Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <X size={20} color={theme.mu} />
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Тип операції</Text>
          <View style={styles.statusChipsRow}>
            {CARE_TYPES.map((c) => (
              <Pressable
                key={c.val}
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: type === c.val ? '#2980B9' : theme.bg,
                    borderColor: type === c.val ? '#2980B9' : theme.bd,
                  },
                ]}
                onPress={() => onChangeType(c.val)}
              >
                <Text
                  style={{
                    color: type === c.val ? '#fff' : theme.tx,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Коментар</Text>
          <TextInput
            style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="Полив теплою водою під корінь"
            placeholderTextColor={theme.mu}
          />

          <Pressable
            style={[styles.submitModalBtn, { backgroundColor: '#2980B9' }]}
            disabled={loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitModalBtnText}>Зафіксувати догляд</Text>
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

export const CareModal = memo(CareModalInner);
