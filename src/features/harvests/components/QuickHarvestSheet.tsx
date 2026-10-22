import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AlertCircle, Check, ChevronDown, Minus, Plus, Scale, Sparkles, X } from 'lucide-react-native';
import type { HarvestUnit, PlantDto, ZoneDto } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import {
  HARVEST_UNIT_OPTIONS,
  getDefaultInitialQuantity,
  getRememberedUnit,
  getStepperStep,
  getUnitShortLabel,
  rememberLastUnit,
} from '../lib/harvest-defaults';
import type { CropHarvestDraft } from '../types';

interface QuickHarvestSheetProps {
  open: boolean;
  preselectedZoneId?: string | null;
  preselectedPlantId?: string | null;
  zones: ZoneDto[];
  plants: PlantDto[];
  theme: ThemeTokens;
  loading?: boolean;
  onClose: () => void;
  onSaveHarvest: (drafts: CropHarvestDraft[], batchId: string) => Promise<void>;
}

function QuickHarvestSheetInner({
  open,
  preselectedZoneId,
  preselectedPlantId,
  zones,
  plants,
  theme,
  loading = false,
  onClose,
  onSaveHarvest,
}: QuickHarvestSheetProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedPlants, setSelectedPlants] = useState<Record<string, { qty: number; unit: HarvestUnit }>>({});
  const [isZonePickerOpen, setIsZonePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize selected zone
  useEffect(() => {
    if (!open) return;
    if (preselectedZoneId) {
      setSelectedZoneId(preselectedZoneId);
    } else if (preselectedPlantId) {
      const pl = plants.find((p) => p.id === preselectedPlantId);
      if (pl?.zoneId) setSelectedZoneId(pl.zoneId);
    } else if (zones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [open, preselectedZoneId, preselectedPlantId, zones, plants, selectedZoneId]);

  // Available plants for the active zone
  const zonePlants = useMemo(() => {
    if (!selectedZoneId) return [];
    return plants
      .filter((p) => p.zoneId === selectedZoneId)
      .sort((a, b) => {
        // Active/harvesting first
        if (a.status === 'HARVESTING' && b.status !== 'HARVESTING') return -1;
        if (b.status === 'HARVESTING' && a.status !== 'HARVESTING') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [plants, selectedZoneId]);

  // Pre-select plant if specified
  useEffect(() => {
    if (!open) return;
    if (preselectedPlantId && zonePlants.some((p) => p.id === preselectedPlantId)) {
      void (async () => {
        const pl = zonePlants.find((p) => p.id === preselectedPlantId);
        if (pl) {
          const unit = await getRememberedUnit(pl.name);
          setSelectedPlants({
            [pl.id]: { qty: getDefaultInitialQuantity(unit), unit },
          });
        }
      })();
    } else if (zonePlants.length > 0 && Object.keys(selectedPlants).length === 0) {
      // Auto-select the first crop (active 1-tap UX!)
      const first = zonePlants[0];
      void (async () => {
        const unit = await getRememberedUnit(first.name);
        setSelectedPlants({
          [first.id]: { qty: getDefaultInitialQuantity(unit), unit },
        });
      })();
    }
  }, [open, preselectedPlantId, zonePlants]);

  const activeZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? zones[0],
    [zones, selectedZoneId],
  );

  const togglePlantSelection = useCallback(async (plant: PlantDto) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    setSelectedPlants((prev) => {
      const copy = { ...prev };
      if (copy[plant.id]) {
        delete copy[plant.id];
      } else {
        copy[plant.id] = { qty: 1, unit: 'KILOGRAM' };
      }
      return copy;
    });

    // Check remembered unit
    if (!selectedPlants[plant.id]) {
      const unit = await getRememberedUnit(plant.name);
      setSelectedPlants((prev) => {
        if (!prev[plant.id]) return prev;
        return {
          ...prev,
          [plant.id]: { qty: getDefaultInitialQuantity(unit), unit },
        };
      });
    }
  }, [selectedPlants]);

  const updateQuantity = useCallback((plantId: string, delta: number) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    setSelectedPlants((prev) => {
      const cur = prev[plantId];
      if (!cur) return prev;
      const step = getStepperStep(cur.unit);
      const newQty = Math.max(step, Math.round((cur.qty + delta * step) * 10) / 10);
      return {
        ...prev,
        [plantId]: { ...cur, qty: newQty },
      };
    });
  }, []);

  const setManualQuantity = useCallback((plantId: string, text: string) => {
    const val = parseFloat(text.replace(',', '.'));
    setSelectedPlants((prev) => {
      const cur = prev[plantId];
      if (!cur) return prev;
      return {
        ...prev,
        [plantId]: { ...cur, qty: isNaN(val) ? 0 : val },
      };
    });
  }, []);

  const changeUnit = useCallback(async (plantId: string, plantName: string, unit: HarvestUnit) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    setSelectedPlants((prev) => {
      const cur = prev[plantId];
      if (!cur) return prev;
      return {
        ...prev,
        [plantId]: { ...cur, unit },
      };
    });
    await rememberLastUnit(plantName, unit);
  }, []);

  const handleSave = async () => {
    const drafts: CropHarvestDraft[] = [];
    const batchId = `b_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    for (const [plantId, data] of Object.entries(selectedPlants)) {
      if (data.qty <= 0) continue;
      const pl = plants.find((p) => p.id === plantId);
      if (!pl) continue;

      drafts.push({
        plantId,
        plantName: pl.name,
        zoneId: pl.zoneId,
        zoneName: activeZone?.name,
        variety: pl.variety,
        hasProblem: pl.status === 'HAS_PROBLEM' || (pl.openProblemsCount ?? 0) > 0,
        quantity: data.qty,
        unit: data.unit,
      });
    }

    if (drafts.length === 0) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }

    setSubmitting(true);
    try {
      await onSaveHarvest(drafts, batchId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = Object.keys(selectedPlants).length;
  const hasValidQuantity = Object.values(selectedPlants).some((p) => p.qty > 0);

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: theme.ac3 }]}>
                <Sparkles size={20} color={theme.ac} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.tx }]}>Швидкий збір урожаю</Text>
                <Text style={[styles.subtitle, { color: theme.mu }]}>
                  {new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })} · сьогодні
                </Text>
              </View>
            </View>
            <Pressable
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрити вікно збору"
            >
              <X size={18} color={theme.mu} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Zone Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.mu }]}>Грядка / Зона</Text>
              <Pressable
                style={[styles.zonePickerBtn, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                onPress={() => setIsZonePickerOpen((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Змінити грядку"
              >
                <Text style={[styles.zonePickerText, { color: theme.tx }]}>
                  {activeZone ? activeZone.name : 'Оберіть зону'}
                </Text>
                <ChevronDown size={18} color={theme.mu} />
              </Pressable>

              {isZonePickerOpen ? (
                <View style={[styles.zoneDropdown, { backgroundColor: theme.bg, borderColor: theme.bd }]}>
                  {zones.map((z) => (
                    <Pressable
                      key={z.id}
                      style={[
                        styles.zoneDropdownItem,
                        z.id === selectedZoneId && { backgroundColor: theme.ac3 },
                      ]}
                      onPress={() => {
                        setSelectedZoneId(z.id);
                        setSelectedPlants({});
                        setIsZonePickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.zoneDropdownItemText,
                          { color: z.id === selectedZoneId ? theme.ac : theme.tx },
                        ]}
                      >
                        {z.name}
                      </Text>
                      {z.id === selectedZoneId ? <Check size={16} color={theme.ac} /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Crop Chips Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.mu }]}>
                Культури на цій грядці {zonePlants.length > 0 ? `(${zonePlants.length})` : ''}
              </Text>

              {zonePlants.length === 0 ? (
                <View style={[styles.emptyZoneNotice, { backgroundColor: theme.bg, borderColor: theme.bd }]}>
                  <Text style={[styles.emptyZoneText, { color: theme.mu }]}>
                    У цій зоні ще немає висаджених рослин. Створіть рослину в розділі «Сади».
                  </Text>
                </View>
              ) : (
                <View style={styles.cropsChipsRow}>
                  {zonePlants.map((plant) => {
                    const isSelected = Boolean(selectedPlants[plant.id]);
                    const isHarvesting = plant.status === 'HARVESTING';
                    const hasProblem = plant.status === 'HAS_PROBLEM' || (plant.openProblemsCount ?? 0) > 0;

                    return (
                      <Pressable
                        key={plant.id}
                        onPress={() => void togglePlantSelection(plant)}
                        style={[
                          styles.cropChip,
                          {
                            backgroundColor: isSelected ? theme.ac : theme.bg,
                            borderColor: isSelected ? theme.ac : theme.bd,
                          },
                        ]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`Культура ${plant.name}`}
                      >
                        {hasProblem ? (
                          <AlertCircle size={14} color={isSelected ? '#fff' : '#E74C3C'} style={{ marginRight: 4 }} />
                        ) : null}
                        <Text
                          style={[
                            styles.cropChipText,
                            { color: isSelected ? '#ffffff' : theme.tx, fontWeight: isSelected ? '700' : '500' },
                          ]}
                        >
                          {plant.name}
                        </Text>
                        {isHarvesting ? (
                          <View
                            style={[
                              styles.readyMiniBadge,
                              { backgroundColor: isSelected ? '#ffffff' : '#D35400' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.readyMiniText,
                                { color: isSelected ? theme.ac : '#ffffff' },
                              ]}
                            >
                              Час
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Quantity Steppers for Selected Crops */}
            {selectedCount > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.mu }]}>
                  Кількість для запису ({selectedCount})
                </Text>

                {Object.entries(selectedPlants).map(([plantId, data]) => {
                  const plant = plants.find((p) => p.id === plantId);
                  if (!plant) return null;

                  return (
                    <View
                      key={plantId}
                      style={[styles.stepperCard, { backgroundColor: theme.bg, borderColor: theme.bd }]}
                    >
                      <View style={styles.stepperCropHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stepperCropName, { color: theme.tx }]}>
                            {plant.name}
                          </Text>
                          {plant.variety ? (
                            <Text style={[styles.stepperCropVariety, { color: theme.mu }]}>
                              сорт: {plant.variety}
                            </Text>
                          ) : null}
                        </View>

                        {/* Unit selector pill */}
                        <View style={styles.unitPillsRow}>
                          {HARVEST_UNIT_OPTIONS.map((u) => {
                            const isCurrent = data.unit === u.value;
                            return (
                              <Pressable
                                key={u.value}
                                onPress={() => void changeUnit(plantId, plant.name, u.value)}
                                style={[
                                  styles.unitPill,
                                  {
                                    backgroundColor: isCurrent ? theme.ac : theme.pn,
                                    borderColor: isCurrent ? theme.ac : theme.bd,
                                  },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Одиниця ${u.short}`}
                              >
                                <Text
                                  style={[
                                    styles.unitPillText,
                                    { color: isCurrent ? '#fff' : theme.mu },
                                  ]}
                                >
                                  {u.short}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      {/* Large Stepper */}
                      <View style={styles.stepperControlRow}>
                        <Pressable
                          style={[styles.stepperBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                          onPress={() => updateQuantity(plantId, -1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Зменшити кількість для ${plant.name}`}
                          hitSlop={8}
                        >
                          <Minus size={20} color={theme.tx} />
                        </Pressable>

                        <View style={styles.stepperInputWrap}>
                          <TextInput
                            style={[styles.stepperInput, { color: theme.tx }]}
                            keyboardType="numeric"
                            value={String(data.qty)}
                            onChangeText={(t) => setManualQuantity(plantId, t)}
                            accessibilityLabel={`Ввести кількість для ${plant.name}`}
                            selectTextOnFocus
                          />
                          <Text style={[styles.stepperUnitSuffix, { color: theme.mu }]}>
                            {getUnitShortLabel(data.unit)}
                          </Text>
                        </View>

                        <Pressable
                          style={[styles.stepperBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                          onPress={() => updateQuantity(plantId, 1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Збільшити кількість для ${plant.name}`}
                          hitSlop={8}
                        >
                          <Plus size={20} color={theme.tx} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: theme.bd }]}>
            <Pressable
              disabled={!hasValidQuantity || submitting || loading}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: theme.ac,
                  opacity: !hasValidQuantity || submitting || loading ? 0.5 : 1,
                },
              ]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Зберегти збір урожаю"
            >
              {submitting || loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Scale size={18} color="#ffffff" />
                  <Text style={styles.saveBtnText}>
                    {selectedCount > 1
                      ? `Записати збір (${selectedCount} культури)`
                      : 'Записати збір'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const QuickHarvestSheet = memo(QuickHarvestSheetInner);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    maxHeight: '88%',
    minHeight: 380,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
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
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  zonePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
  },
  zonePickerText: {
    fontSize: 15,
    fontWeight: '700',
  },
  zoneDropdown: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  zoneDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  zoneDropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cropsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44, // 44dp accessible tap target
  },
  cropChipText: {
    fontSize: 14,
  },
  readyMiniBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readyMiniText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyZoneNotice: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyZoneText: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepperCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  stepperCropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepperCropName: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepperCropVariety: {
    fontSize: 12,
    marginTop: 2,
  },
  unitPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepperBtn: {
    width: 48,
    height: 48, // 48dp target
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepperInput: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 80,
    paddingVertical: 4,
  },
  stepperUnitSuffix: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 52,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
