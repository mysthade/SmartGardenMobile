import { memo, useState, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, Check, ChevronDown, Save, X } from 'lucide-react-native';
import { updatePlantSchema } from '@smart-garden/validation';
import type { PlantDto, PlantStatus } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import {
  formatDateToYMD,
  formatDateUkrainian,
  getStatusMeta,
  isOverviewDirty,
  PLANT_STATUS_OPTIONS,
  type PlantFormFields,
} from '../../lib/plant-helpers';

interface OverviewTabProps {
  plant: PlantDto;
  theme: ThemeTokens;
  onSave: (values: Partial<PlantDto> & { version: number }) => Promise<void>;
  isSaving: boolean;
  serverError: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

function OverviewTabInner({
  plant,
  theme,
  onSave,
  isSaving,
  serverError,
  onDirtyChange,
}: OverviewTabProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  // Form State
  const [name, setName] = useState(plant.name);
  const [variety, setVariety] = useState(plant.variety ?? '');
  const [quantity, setQuantity] = useState(String(plant.quantity ?? 1));
  const [status, setStatus] = useState<PlantStatus>(plant.status);
  const [description, setDescription] = useState(plant.description ?? '');
  const [plantedAt, setPlantedAt] = useState<string | null>(plant.plantedAt);

  // Modals / Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const formValues: PlantFormFields = useMemo(
    () => ({
      name,
      variety,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      status,
      description,
      plantedAt,
    }),
    [name, variety, quantity, status, description, plantedAt],
  );

  const isDirty = useMemo(() => isOverviewDirty(plant, formValues), [plant, formValues]);

  // Notify parent of dirty state for exit guards
  useCallback(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange])();

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setPlantedAt(selectedDate.toISOString());
    }
  };

  const handleSave = async () => {
    setClientErrors({});
    const parsedQty = parseInt(quantity, 10);

    const payload = {
      name: name.trim(),
      variety: variety.trim() ? variety.trim() : null,
      quantity: Number.isNaN(parsedQty) ? 1 : parsedQty,
      status,
      description: description.trim() ? description.trim() : null,
      plantedAt: plantedAt ? formatDateToYMD(plantedAt) : null,
      version: plant.version,
    };

    const validation = updatePlantSchema.safeParse(payload);
    if (!validation.success) {
      const errs: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? 'form');
        errs[field] = issue.message;
      }
      setClientErrors(errs);
      return;
    }

    await onSave(payload as Partial<PlantDto> & { version: number });
  };

  const statusMeta = getStatusMeta(status);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.bg },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {serverError ? (
        <View style={[styles.errorBanner, { backgroundColor: '#FDE8E8', borderColor: theme.danger }]}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.errorBannerText, { color: theme.danger }]}>
            {serverError}
          </Text>
        </View>
      ) : null}

      <View style={[styles.formCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={isWide ? styles.gridTwoCols : styles.gridOneCol}>
          {/* Name Field */}
          <View style={styles.fieldGroup}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: theme.tx }]}>
              Назва рослини <Text style={{ color: theme.danger }}>*</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Наприклад: Томат Чері"
              placeholderTextColor={theme.mu}
              style={[
                styles.input,
                { backgroundColor: theme.bg, borderColor: clientErrors.name ? theme.danger : theme.bd, color: theme.tx },
              ]}
            />
            {clientErrors.name ? (
              <Text maxFontSizeMultiplier={1.3} style={[styles.errorText, { color: theme.danger }]}>
                {clientErrors.name}
              </Text>
            ) : null}
          </View>

          {/* Variety Field */}
          <View style={styles.fieldGroup}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: theme.tx }]}>
              Сорт
            </Text>
            <TextInput
              value={variety}
              onChangeText={setVariety}
              placeholder="Наприклад: Санька, Балконне диво"
              placeholderTextColor={theme.mu}
              style={[
                styles.input,
                { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx },
              ]}
            />
          </View>

          {/* Quantity Field */}
          <View style={styles.fieldGroup}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: theme.tx }]}>
              Кількість (шт.) <Text style={{ color: theme.danger }}>*</Text>
            </Text>
            <View style={styles.qtyControlRow}>
              <Pressable
                onPress={() => {
                  const currentVal = parseInt(quantity, 10) || 1;
                  if (currentVal > 1) setQuantity(String(currentVal - 1));
                }}
                style={[styles.qtyBtn, { borderColor: theme.bd, backgroundColor: theme.bg }]}
              >
                <Text style={[styles.qtyBtnText, { color: theme.tx }]}>−</Text>
              </Pressable>
              <TextInput
                value={quantity}
                onChangeText={(val) => setQuantity(val.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={[
                  styles.input,
                  styles.qtyInput,
                  { backgroundColor: theme.bg, borderColor: clientErrors.quantity ? theme.danger : theme.bd, color: theme.tx },
                ]}
              />
              <Pressable
                onPress={() => {
                  const currentVal = parseInt(quantity, 10) || 0;
                  setQuantity(String(currentVal + 1));
                }}
                style={[styles.qtyBtn, { borderColor: theme.bd, backgroundColor: theme.bg }]}
              >
                <Text style={[styles.qtyBtnText, { color: theme.tx }]}>+</Text>
              </Pressable>
            </View>
            {clientErrors.quantity ? (
              <Text maxFontSizeMultiplier={1.3} style={[styles.errorText, { color: theme.danger }]}>
                {clientErrors.quantity}
              </Text>
            ) : null}
          </View>

          {/* Status Field */}
          <View style={styles.fieldGroup}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: theme.tx }]}>
              Статус розвитку
            </Text>
            <Pressable
              onPress={() => setShowStatusModal(true)}
              style={[
                styles.selectButton,
                { backgroundColor: theme.bg, borderColor: theme.bd },
              ]}
            >
              <View style={[styles.statusTag, { backgroundColor: statusMeta.badgeBg }]}>
                <Text style={[styles.statusTagText, { color: statusMeta.badgeColor }]}>
                  {statusMeta.label}
                </Text>
              </View>
              <ChevronDown size={18} color={theme.mu} />
            </Pressable>
          </View>

          {/* Planted Date Field */}
          <View style={styles.fieldGroup}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: theme.tx }]}>
              Дата посадки
            </Text>
            <View style={styles.datePickerRow}>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.selectButton,
                  { flex: 1, backgroundColor: theme.bg, borderColor: theme.bd },
                ]}
              >
                <Calendar size={18} color={theme.mu} />
                <Text style={[styles.dateText, { color: plantedAt ? theme.tx : theme.mu }]}>
                  {plantedAt ? formatDateUkrainian(plantedAt) : 'Оберіть дату'}
                </Text>
              </Pressable>
              {plantedAt ? (
                <Pressable
                  onPress={() => setPlantedAt(null)}
                  hitSlop={8}
                  style={[styles.clearDateBtn, { borderColor: theme.bd }]}
                >
                  <X size={16} color={theme.mu} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Culture Readonly */}
          <View style={styles.fieldGroup}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: theme.tx }]}>
              Тип культури
            </Text>
            <View style={[styles.readonlyField, { backgroundColor: theme.bg, borderColor: theme.bd }]}>
              <Text style={[styles.readonlyText, { color: theme.mu }]}>
                {plant.plantType?.name ?? 'Не привʼязано'}
              </Text>
            </View>
          </View>
        </View>

        {/* Description Field (Full width) */}
        <View style={[styles.fieldGroup, { marginTop: 12 }]}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: theme.tx }]}>
            Опис / примітки
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Особливості росту, місце посадки, нотатки..."
            placeholderTextColor={theme.mu}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.textarea,
              { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx },
            ]}
          />
        </View>

        {/* Save Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Зберегти картку"
          disabled={!isDirty || isSaving}
          onPress={handleSave}
          style={[
            styles.saveButton,
            { backgroundColor: isDirty && !isSaving ? theme.ac : theme.bd },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={18} color={isDirty ? '#ffffff' : theme.mu} />
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.saveButtonText,
                  { color: isDirty ? '#ffffff' : theme.mu },
                ]}
              >
                {isDirty ? 'Зберегти зміни' : 'Змін немає'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Date Picker (Native or iOS Sheet) */}
      {showDatePicker ? (
        <DateTimePicker
          value={plantedAt ? new Date(plantedAt) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}

      {/* Status Selection Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => setShowStatusModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowStatusModal(false)}>
          <View style={[styles.statusModalCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.statusModalHeader}>
              <Text style={[styles.statusModalTitle, { color: theme.tx }]}>Оберіть статус рослини</Text>
              <Pressable hitSlop={10} onPress={() => setShowStatusModal(false)}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            <View style={styles.statusList}>
              {PLANT_STATUS_OPTIONS.map((item) => {
                const isSelected = status === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      setStatus(item.value);
                      setShowStatusModal(false);
                    }}
                    style={[
                      styles.statusOptionRow,
                      { borderColor: isSelected ? theme.ac : theme.bd, backgroundColor: isSelected ? theme.ac3 : theme.bg },
                    ]}
                  >
                    <View style={[styles.statusBadgeSmall, { backgroundColor: item.badgeBg }]}>
                      <Text style={[styles.statusBadgeSmallText, { color: item.badgeColor }]}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected ? <Check size={18} color={theme.ac} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

export const OverviewTab = memo(OverviewTabInner);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  gridOneCol: {
    gap: 14,
  },
  gridTwoCols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  fieldGroup: {
    flex: 1,
    minWidth: 260,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 90,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: '700',
  },
  qtyInput: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  selectButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  clearDateBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readonlyField: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  readonlyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  statusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusList: {
    gap: 8,
  },
  statusOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeSmall: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusBadgeSmallText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
