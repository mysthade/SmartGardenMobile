import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Copy, Edit2, Plus, Trash2, X } from 'lucide-react-native';
import type { GardenPlanDto } from '@smart-garden/types';
import { cmToMeters, metersToCm } from '@smart-garden/validation';
import {
  useCreatePlanMutation,
  useDeletePlanMutation,
  useDuplicatePlanMutation,
  useUpdatePlanMutation,
} from '../../hooks/use-planner-data';

interface PlanSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  gardenId: string;
  activePlanId: string;
  plans: GardenPlanDto[];
  onSelectPlan: (planId: string) => void;
  isDark: boolean;
}

export function PlanSelectorModal({
  visible,
  onClose,
  gardenId,
  activePlanId,
  plans,
  onSelectPlan,
  isDark,
}: PlanSelectorModalProps) {
  const insets = useSafeAreaInsets();

  const [createMode, setCreateMode] = useState(false);
  const [newPlanName, setNewPlanName] = useState('Новий план');
  const [newPlanWidthM, setNewPlanWidthM] = useState('20');
  const [newPlanHeightM, setNewPlanHeightM] = useState('15');

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const createMutation = useCreatePlanMutation(gardenId);
  const updateMutation = useUpdatePlanMutation(gardenId);
  const deleteMutation = useDeletePlanMutation(gardenId);
  const duplicateMutation = useDuplicatePlanMutation(gardenId);

  const bg = isDark ? '#151f1a' : '#ffffff';
  const text = isDark ? '#eaf2ec' : '#14201a';
  const muted = isDark ? '#8ea497' : '#5f6f66';
  const border = isDark ? '#243228' : '#e2ece2';
  const cardBg = isDark ? '#1e2b24' : '#f6faf6';

  const handleCreateSubmit = async () => {
    const wM = parseFloat(newPlanWidthM);
    const hM = parseFloat(newPlanHeightM);
    if (!wM || !hM || wM <= 0 || hM <= 0) {
      Alert.alert('Помилка', 'Введіть коректні розміри ділянки');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: newPlanName.trim() || 'Новий план',
        widthCm: metersToCm(wM),
        heightCm: metersToCm(hM),
        gridSizeCm: 50,
        northAngleDeg: 0,
      });
      setCreateMode(false);
      onSelectPlan(created.id);
      onClose();
    } catch {
      Alert.alert('Помилка', 'Не вдалося створити план');
    }
  };

  const handleDuplicate = async (plan: GardenPlanDto) => {
    try {
      const duplicated = await duplicateMutation.mutateAsync(plan.id);
      onSelectPlan(duplicated.id);
      onClose();
    } catch {
      Alert.alert('Помилка', 'Не вдалося дублювати план');
    }
  };

  const handleDelete = (plan: GardenPlanDto) => {
    if (plans.length <= 1) {
      Alert.alert('Увага', 'Неможливо видалити єдиний план саду');
      return;
    }

    Alert.alert(
      'Видалити план?',
      `Видалити «${plan.name}» та всі його обʼєкти?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            await deleteMutation.mutateAsync(plan.id);
            if (plan.id === activePlanId) {
              const remaining = plans.filter((p) => p.id !== plan.id);
              if (remaining[0]) {
                onSelectPlan(remaining[0].id);
              }
            }
          },
        },
      ],
    );
  };

  const handleSaveRename = async (planId: string) => {
    if (!editName.trim()) return;
    try {
      await updateMutation.mutateAsync({
        planId,
        data: { name: editName.trim() },
      });
      setEditingPlanId(null);
    } catch {
      Alert.alert('Помилка', 'Не вдалося перейменувати план');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <Text style={[styles.title, { color: text }]}>
              {createMode ? 'Створити новий план' : 'Плани території'}
            </Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: cardBg }]} onPress={onClose}>
              <X size={18} color={text} />
            </Pressable>
          </View>

          {createMode ? (
            /* Create new plan form */
            <View style={styles.formContent}>
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Назва плану</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                  value={newPlanName}
                  onChangeText={setNewPlanName}
                  placeholder="Наприклад, Літній сад"
                  placeholderTextColor={muted}
                />
              </View>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>Ширина (метри)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                    keyboardType="numeric"
                    value={newPlanWidthM}
                    onChangeText={setNewPlanWidthM}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>Довжина (метри)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: cardBg, color: text, borderColor: border }]}
                    keyboardType="numeric"
                    value={newPlanHeightM}
                    onChangeText={setNewPlanHeightM}
                  />
                </View>
              </View>

              <View style={styles.formButtons}>
                <Pressable
                  style={[styles.cancelBtn, { borderColor: border }]}
                  onPress={() => setCreateMode(false)}
                >
                  <Text style={{ color: muted, fontWeight: '600' }}>Скасувати</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitBtn, { backgroundColor: '#2f8f57' }]}
                  onPress={handleCreateSubmit}
                  disabled={createMutation.isPending}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {createMutation.isPending ? 'Створення...' : 'Створити план'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Plans list */
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {plans.map((p) => {
                const isActive = p.id === activePlanId;
                const isEditing = editingPlanId === p.id;
                const wM = cmToMeters(p.widthCm);
                const hM = cmToMeters(p.heightCm);

                return (
                  <View
                    key={p.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: cardBg,
                        borderColor: isActive ? '#2f8f57' : border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                  >
                    <Pressable
                      style={styles.planCardMain}
                      onPress={() => {
                        onSelectPlan(p.id);
                        onClose();
                      }}
                    >
                      <View style={styles.planCardTitleRow}>
                        {isEditing ? (
                          <View style={styles.renameRow}>
                            <TextInput
                              style={[styles.renameInput, { color: text, borderColor: border }]}
                              value={editName}
                              onChangeText={setEditName}
                              autoFocus
                            />
                            <Pressable
                              style={[styles.saveRenameBtn, { backgroundColor: '#2f8f57' }]}
                              onPress={() => handleSaveRename(p.id)}
                            >
                              <Check size={14} color="#fff" />
                            </Pressable>
                          </View>
                        ) : (
                          <Text style={[styles.planName, { color: text }]}>{p.name}</Text>
                        )}
                        {isActive ? (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Активний</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.planSubtitle, { color: muted }]}>
                        {wM} × {hM} м • v{p.version}
                      </Text>
                    </Pressable>

                    {/* Actions */}
                    <View style={styles.cardActions}>
                      <Pressable
                        style={[styles.smallIconBtn, { backgroundColor: bg }]}
                        onPress={() => {
                          setEditingPlanId(p.id);
                          setEditName(p.name);
                        }}
                        accessibilityLabel="Перейменувати"
                      >
                        <Edit2 size={15} color={muted} />
                      </Pressable>
                      <Pressable
                        style={[styles.smallIconBtn, { backgroundColor: bg }]}
                        onPress={() => handleDuplicate(p)}
                        accessibilityLabel="Дублювати план"
                      >
                        <Copy size={15} color={muted} />
                      </Pressable>
                      <Pressable
                        style={[styles.smallIconBtn, { backgroundColor: bg }]}
                        onPress={() => handleDelete(p)}
                        accessibilityLabel="Видалити план"
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {/* Add plan button */}
              <Pressable
                style={[styles.addNewPlanBtn, { borderColor: '#2f8f57' }]}
                onPress={() => {
                  setNewPlanName(`План ${plans.length + 1}`);
                  setCreateMode(true);
                }}
              >
                <Plus size={18} color="#2f8f57" />
                <Text style={styles.addNewPlanBtnText}>Створити новий план</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  planCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardMain: {
    flex: 1,
  },
  planCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
  },
  planSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  activeBadge: {
    backgroundColor: '#eaf6ee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#2f8f57',
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  renameInput: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  saveRenameBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 6,
    marginBottom: 16,
  },
  addNewPlanBtnText: {
    color: '#2f8f57',
    fontSize: 14,
    fontWeight: '700',
  },
  formContent: {
    padding: 18,
  },
  fieldSection: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
