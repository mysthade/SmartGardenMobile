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
import { ZONE_TYPES } from '../../lib/gardens-helpers';

type Theme = {
  pn: string;
  bd: string;
  tx: string;
  mu: string;
  bg: string;
  ac: string;
  danger: string;
};

type AddZoneModalProps = {
  open: boolean;
  name: string;
  type: string;
  width: string;
  height: string;
  error: string | null;
  loading: boolean;
  theme: Theme;
  onChangeName: (v: string) => void;
  onChangeType: (v: string) => void;
  onChangeWidth: (v: string) => void;
  onChangeHeight: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function AddZoneModalInner({
  open,
  name,
  type,
  width,
  height,
  error,
  loading,
  theme,
  onChangeName,
  onChangeType,
  onChangeWidth,
  onChangeHeight,
  onSubmit,
  onClose,
}: AddZoneModalProps) {
  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.tx }]}>Додати зону до саду</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <X size={20} color={theme.mu} />
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Назва зони *</Text>
          <TextInput
            style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            value={name}
            onChangeText={onChangeName}
            placeholder="напр. Теплиця з перцем"
            placeholderTextColor={theme.mu}
          />

          <Text style={[styles.fieldLabel, { color: theme.mu }]}>Тип зони</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.typesRow}>
              {ZONE_TYPES.map((zt) => {
                const isSel = type === zt.value;
                return (
                  <Pressable
                    key={zt.value}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSel ? theme.ac : theme.bg,
                        borderColor: isSel ? theme.ac : theme.bd,
                      },
                    ]}
                    onPress={() => onChangeType(zt.value)}
                  >
                    <Text style={[styles.typeChipText, { color: isSel ? '#fff' : theme.tx }]}>
                      {zt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.mu }]}>Ширина (м)</Text>
              <TextInput
                style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
                value={width}
                onChangeText={onChangeWidth}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={theme.mu}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.mu }]}>Довжина (м)</Text>
              <TextInput
                style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
                value={height}
                onChangeText={onChangeHeight}
                keyboardType="numeric"
                placeholder="6"
                placeholderTextColor={theme.mu}
              />
            </View>
          </View>

          {error ? (
            <Text style={[styles.zoneError, { color: theme.danger }]}>{error}</Text>
          ) : null}

          <Pressable
            style={[styles.submitModalBtn, { backgroundColor: theme.ac, opacity: !name.trim() ? 0.6 : 1 }]}
            disabled={!name.trim() || loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitModalBtnText}>Створити зону</Text>
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
  submitModalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  zoneError: { fontSize: 13, marginTop: 10, textAlign: 'center' },
});

export const AddZoneModal = memo(AddZoneModalInner);
