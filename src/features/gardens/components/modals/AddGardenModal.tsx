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
  ac: string;
};

type AddGardenModalProps = {
  open: boolean;
  name: string;
  location: string;
  area: string;
  loading: boolean;
  theme: Theme;
  onChangeName: (v: string) => void;
  onChangeLocation: (v: string) => void;
  onChangeArea: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function AddGardenModalInner({
  open,
  name,
  location,
  area,
  loading,
  theme,
  onChangeName,
  onChangeLocation,
  onChangeArea,
  onSubmit,
  onClose,
}: AddGardenModalProps) {
  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.tx }]}>Створити новий сад</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <X size={20} color={theme.mu} />
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Назва саду *</Text>
          <TextInput
            style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            value={name}
            onChangeText={onChangeName}
            placeholder="напр. Дача у Вишгороді"
            placeholderTextColor={theme.mu}
          />

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Локація / місто</Text>
          <TextInput
            style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            value={location}
            onChangeText={onChangeLocation}
            placeholder="напр. Київська область"
            placeholderTextColor={theme.mu}
          />

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Загальна площа (м²)</Text>
          <TextInput
            style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            value={area}
            onChangeText={onChangeArea}
            keyboardType="numeric"
            placeholder="напр. 600"
            placeholderTextColor={theme.mu}
          />

          <Pressable
            style={[styles.submitModalBtn, { backgroundColor: theme.ac, opacity: !name.trim() ? 0.6 : 1 }]}
            disabled={!name.trim() || loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitModalBtnText}>Створити сад</Text>
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
  submitModalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export const AddGardenModal = memo(AddGardenModalInner);
