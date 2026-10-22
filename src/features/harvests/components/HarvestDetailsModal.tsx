import { memo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Clock, Image as ImageIcon, Trash2, X } from 'lucide-react-native';
import type { HarvestQuality } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import { HARVEST_QUALITY_OPTIONS, getUnitShortLabel } from '../lib/harvest-defaults';
import type { HarvestExtendedItem } from '../types';

interface HarvestDetailsModalProps {
  harvest: HarvestExtendedItem | null;
  theme: ThemeTokens;
  loading?: boolean;
  onClose: () => void;
  onSaveDetails: (
    harvestId: string,
    updates: {
      quality: HarvestQuality;
      notes: string | null;
      damagedQuantity?: string | null;
      harvestedAt: string;
      localPhotoUri?: string | null;
    },
  ) => Promise<void>;
  onDeleteHarvest?: (harvestId: string) => void;
}

function HarvestDetailsModalInner({
  harvest,
  theme,
  loading = false,
  onClose,
  onSaveDetails,
  onDeleteHarvest,
}: HarvestDetailsModalProps) {
  const [quality, setQuality] = useState<HarvestQuality>(harvest?.quality ?? 'GOOD');
  const [notes, setNotes] = useState<string>(harvest?.notes ?? '');
  const [damagedQty, setDamagedQty] = useState<string>(harvest?.damagedQuantity ?? '');
  const [harvestedAt, setHarvestedAt] = useState<Date>(
    harvest?.harvestedAt ? new Date(harvest.harvestedAt) : new Date(),
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!harvest) return null;

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Доступ заборонено', 'Будь ласка, надайте доступ до фото для прикріплення світлини.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося вибрати фото');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Доступ заборонено', 'Будь ласка, надайте доступ до камери для створення знімка.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося зробити фото');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveDetails(harvest.id, {
        quality,
        notes: notes.trim() || null,
        damagedQuantity: damagedQty.trim() || null,
        harvestedAt: harvestedAt.toISOString(),
        localPhotoUri: photoUri,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не вдалося зберегти деталі';
      Alert.alert('Помилка', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={Boolean(harvest)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.tx }]}>
                Деталі збору: {harvest.plantName}
              </Text>
              <Text style={[styles.subtitle, { color: theme.mu }]}>
                {harvest.quantity} {getUnitShortLabel(harvest.unit)}
                {harvest.zoneName ? ` · ${harvest.zoneName}` : ''}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
            >
              <X size={18} color={theme.mu} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Quality selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>Якість урожаю</Text>
              <View style={styles.qualityChipsRow}>
                {HARVEST_QUALITY_OPTIONS.map((q) => {
                  const isSelected = quality === q.value;
                  return (
                    <Pressable
                      key={q.value}
                      onPress={() => setQuality(q.value)}
                      style={[
                        styles.qualityChip,
                        {
                          backgroundColor: isSelected ? q.color : theme.bg,
                          borderColor: isSelected ? q.color : theme.bd,
                        },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.qualityChipText,
                          { color: isSelected ? '#ffffff' : theme.tx },
                        ]}
                      >
                        {q.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date and time */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>Дата та час збору</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.input, styles.dateRow, { backgroundColor: theme.bg, borderColor: theme.bd }]}
              >
                <Clock size={16} color={theme.mu} />
                <Text style={[styles.dateText, { color: theme.tx }]}>
                  {harvestedAt.toLocaleDateString('uk-UA', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  о {harvestedAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            </View>

            {/* Damaged quantity */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>
                Пошкоджена кількість ({getUnitShortLabel(harvest.unit)}) (опційно)
              </Text>
              <TextInput
                value={damagedQty}
                onChangeText={setDamagedQty}
                keyboardType="numeric"
                placeholder="напр. 0.5"
                placeholderTextColor={theme.mu}
                style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx }]}
              />
            </View>

            {/* Notes / Sold to / Given to */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>
                Нотатка (сорт, смак, кому продано/віддано)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Наприклад: солодкі плоди, 2 кг передано сусідам..."
                placeholderTextColor={theme.mu}
                style={[
                  styles.input,
                  styles.textarea,
                  { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx },
                ]}
              />
            </View>

            {/* Photo Attachment */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.tx }]}>
                Світлина збору (додається до фото-щоденника)
              </Text>

              {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <Pressable
                    style={styles.removePhotoBtn}
                    onPress={() => setPhotoUri(null)}
                    hitSlop={8}
                  >
                    <X size={14} color="#ffffff" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.photoActionsRow}>
                  <Pressable
                    style={[styles.photoActionBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                    onPress={handlePickPhoto}
                  >
                    <ImageIcon size={18} color={theme.ac} />
                    <Text style={[styles.photoActionText, { color: theme.tx }]}>Галерея</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.photoActionBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                    onPress={handleTakePhoto}
                  >
                    <Camera size={18} color={theme.ac} />
                    <Text style={[styles.photoActionText, { color: theme.tx }]}>Камера</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.bd }]}>
            {onDeleteHarvest ? (
              <Pressable
                style={[styles.deleteBtn, { borderColor: theme.bd }]}
                onPress={() => {
                  Alert.alert('Видалити збір?', 'Видалити цей запис про збір урожаю?', [
                    { text: 'Скасувати', style: 'cancel' },
                    {
                      text: 'Видалити',
                      style: 'destructive',
                      onPress: () => {
                        onDeleteHarvest(harvest.id);
                        onClose();
                      },
                    },
                  ]);
                }}
              >
                <Trash2 size={18} color="#E74C3C" />
              </Pressable>
            ) : null}

            <Pressable
              disabled={saving || loading}
              style={[styles.saveBtn, { backgroundColor: theme.ac }]}
              onPress={handleSave}
            >
              {saving || loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={styles.saveBtnText}>Зберегти деталі</Text>
                </>
              )}
            </Pressable>
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={harvestedAt}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_e: DateTimePickerEvent, d?: Date) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (d) setHarvestedAt(d);
              }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export const HarvestDetailsModal = memo(HarvestDetailsModalInner);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    maxHeight: 460,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textarea: {
    minHeight: 74,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qualityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  qualityChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoPreviewWrap: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 48,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
