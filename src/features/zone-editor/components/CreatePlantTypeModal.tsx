import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { createPlantTypeSchema } from '@smart-garden/validation';
import { api, newIdempotencyKey } from '@/src/lib/api';
import { PLANT_CATEGORY_LABEL } from '@/src/lib/zone-labels';
import type { CatalogTheme } from './PlantCatalogSheet';
import { formatApiError } from '@/src/lib/api-errors';

type Props = {
  open: boolean;
  onClose: () => void;
  theme: CatalogTheme;
};

export function CreatePlantTypeModal({ open, onClose, theme }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.createPlantType({ name: name.trim(), category }, newIdempotencyKey('plant-type')),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plant-types'] });
      setName('');
      setCategory('OTHER');
      setError(null);
      onClose();
    },
    onError: (err) => setError(formatApiError(err, 'Не вдалося створити тип')),
  });

  const categories = Object.entries(PLANT_CATEGORY_LABEL);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.tx }]}>Власний тип рослини</Text>
          <Pressable hitSlop={10} onPress={onClose}>
            <X size={20} color={theme.mu} />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: theme.mu }]}>Назва *</Text>
        <TextInput
          style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          placeholder="напр. Перець болгарський"
          placeholderTextColor={theme.mu}
        />

        <Text style={[styles.label, { color: theme.mu }]}>Категорія</Text>
        <View style={styles.chips}>
          {categories.map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setCategory(value)}
              style={[
                styles.chip,
                {
                  backgroundColor: category === value ? theme.ac : theme.bg,
                  borderColor: theme.bd,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: category === value ? '#fff' : theme.tx }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={[styles.err, { color: theme.danger }]}>{error}</Text> : null}

        <Pressable
          disabled={!name.trim() || mutation.isPending}
          onPress={() => {
            const parsed = createPlantTypeSchema.safeParse({ name: name.trim(), category });
            if (!parsed.success) {
              setError(parsed.error.issues.map((i) => i.message).join('\n'));
              return;
            }
            mutation.mutate();
          }}
          style={[styles.submit, { backgroundColor: theme.ac, opacity: !name.trim() ? 0.6 : 1 }]}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Створити тип</Text>
          )}
        </Pressable>
      </View>
    </Modal>
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
  title: { fontSize: 17, fontWeight: '800' },
  label: { fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  err: { fontSize: 13, marginTop: 10, textAlign: 'center' },
  submit: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
