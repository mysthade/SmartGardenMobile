import { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Switch,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  ShieldCheck,
  RefreshCw,
  Thermometer,
  Wind,
  Droplets,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import { useWeatherStore } from '../lib/weather-store';
import { resolveIpLocation } from '../lib/location';
import type { TempUnit, WindUnit, PrecipUnit } from '../types';

interface WeatherSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WeatherSettingsModal({ visible, onClose }: WeatherSettingsModalProps) {
  const { theme } = useTheme();
  const { settings, updateSettings, setCurrentIpLocation } = useWeatherStore();

  const [isRefreshingIp, setIsRefreshingIp] = useState(false);
  const [ipRefreshMsg, setIpRefreshMsg] = useState<string | null>(null);

  const handleToggleAutoIp = async (value: boolean) => {
    await updateSettings(() => ({ autoDetectIp: value }));
  };

  const handleManualIpRefresh = async () => {
    setIsRefreshingIp(true);
    setIpRefreshMsg(null);
    try {
      const loc = await resolveIpLocation(true);
      if (loc) {
        setCurrentIpLocation(loc);
        setIpRefreshMsg(`Успішно: ${loc.name}, ${loc.country}`);
      } else {
        setIpRefreshMsg('Не вдалося визначити місце за IP');
      }
    } catch {
      setIpRefreshMsg('Помилка оновлення IP');
    } finally {
      setIsRefreshingIp(false);
    }
  };

  const handleSelectTempUnit = async (unit: TempUnit) => {
    await updateSettings(() => ({ tempUnit: unit }));
  };

  const handleSelectWindUnit = async (unit: WindUnit) => {
    await updateSettings(() => ({ windUnit: unit }));
  };

  const handleSelectPrecipUnit = async (unit: PrecipUnit) => {
    await updateSettings(() => ({ precipUnit: unit }));
  };

  const handleToggleAlerts = async (value: boolean) => {
    await updateSettings(() => ({ alertsEnabled: value }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.bg, borderColor: theme.bd }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
              Налаштування погоди
            </Text>
            <Pressable
              style={[styles.closeButton, { backgroundColor: theme.pn }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрити"
            >
              <X size={20} color={theme.tx} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Auto IP Section */}
            <View style={[styles.sectionCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.rowTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                    Визначати місце за IP
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                    Автоматично визначає населений пункт при запуску або зміні мережі
                  </Text>
                </View>
                <Switch
                  value={settings.autoDetectIp}
                  onValueChange={handleToggleAutoIp}
                  trackColor={{ false: theme.bd, true: theme.ac }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.privacyBox, { backgroundColor: theme.name === 'dark' ? '#14251f' : '#eaf6ee' }]}>
                <ShieldCheck size={16} color={theme.ac} />
                <Text style={[styles.privacyText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                  Приватність: передається виключно IP-адреса запиту для прогнозу. Жодні ідентифікатори не зберігаються.
                </Text>
              </View>

              <Pressable
                style={[styles.refreshIpBtn, { borderColor: theme.bd, backgroundColor: theme.bg }]}
                onPress={handleManualIpRefresh}
                disabled={isRefreshingIp}
              >
                {isRefreshingIp ? (
                  <ActivityIndicator size="small" color={theme.ac} />
                ) : (
                  <>
                    <RefreshCw size={14} color={theme.ac} />
                    <Text style={[styles.refreshIpText, { color: theme.ac }]} maxFontSizeMultiplier={1.3}>
                      Оновити визначення за IP зараз
                    </Text>
                  </>
                )}
              </Pressable>

              {ipRefreshMsg && (
                <Text style={[styles.refreshMsg, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                  {ipRefreshMsg}
                </Text>
              )}
            </View>

            {/* Units Section */}
            <View style={[styles.sectionCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <Text style={[styles.sectionHeading, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                Одиниці вимірювання
              </Text>

              {/* Temperature */}
              <View style={styles.unitRow}>
                <View style={styles.unitLabelCol}>
                  <Thermometer size={16} color={theme.ac} />
                  <Text style={[styles.unitLabel, { color: theme.tx }]}>Температура:</Text>
                </View>
                <View style={styles.segmentedWrap}>
                  <Pressable
                    style={[
                      styles.segmentBtn,
                      settings.tempUnit === 'celsius' && { backgroundColor: theme.ac },
                    ]}
                    onPress={() => handleSelectTempUnit('celsius')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: settings.tempUnit === 'celsius' ? '#ffffff' : theme.tx },
                      ]}
                    >
                      °C
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentBtn,
                      settings.tempUnit === 'fahrenheit' && { backgroundColor: theme.ac },
                    ]}
                    onPress={() => handleSelectTempUnit('fahrenheit')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: settings.tempUnit === 'fahrenheit' ? '#ffffff' : theme.tx },
                      ]}
                    >
                      °F
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Wind Speed */}
              <View style={styles.unitRow}>
                <View style={styles.unitLabelCol}>
                  <Wind size={16} color={theme.ac} />
                  <Text style={[styles.unitLabel, { color: theme.tx }]}>Вітер:</Text>
                </View>
                <View style={styles.segmentedWrap}>
                  {(['ms', 'kmh', 'mph'] as WindUnit[]).map((u) => {
                    const isSelected = settings.windUnit === u;
                    const label = u === 'ms' ? 'м/с' : u === 'kmh' ? 'км/г' : 'mph';
                    return (
                      <Pressable
                        key={u}
                        style={[styles.segmentBtn, isSelected && { backgroundColor: theme.ac }]}
                        onPress={() => handleSelectWindUnit(u)}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            { color: isSelected ? '#ffffff' : theme.tx },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Precipitation */}
              <View style={styles.unitRow}>
                <View style={styles.unitLabelCol}>
                  <Droplets size={16} color={theme.ac} />
                  <Text style={[styles.unitLabel, { color: theme.tx }]}>Опади:</Text>
                </View>
                <View style={styles.segmentedWrap}>
                  <Pressable
                    style={[
                      styles.segmentBtn,
                      settings.precipUnit === 'mm' && { backgroundColor: theme.ac },
                    ]}
                    onPress={() => handleSelectPrecipUnit('mm')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: settings.precipUnit === 'mm' ? '#ffffff' : theme.tx },
                      ]}
                    >
                      мм
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentBtn,
                      settings.precipUnit === 'inch' && { backgroundColor: theme.ac },
                    ]}
                    onPress={() => handleSelectPrecipUnit('inch')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: settings.precipUnit === 'inch' ? '#ffffff' : theme.tx },
                      ]}
                    >
                      дюйми
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Weather Alerts Notification Section */}
            <View style={[styles.sectionCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.rowTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                    Сповіщення про заморозки та негоду
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                    Попереджати заздалегідь про зниження температури ≤ 0°C або шторми
                  </Text>
                </View>
                <Switch
                  value={settings.alertsEnabled}
                  onValueChange={handleToggleAlerts}
                  trackColor={{ false: theme.bd, true: theme.ac }}
                  thumbColor="#ffffff"
                />
              </View>

              {settings.alertsEnabled && (
                <View style={[styles.quietHoursBox, { borderColor: theme.bd }]}>
                  <Bell size={14} color={theme.mu} />
                  <Text style={[styles.quietHoursText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                    Тихі години: 22:00 – 07:00 (сповіщення надходять без звуку)
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  privacyText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  refreshIpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    minHeight: 40,
  },
  refreshIpText: {
    fontSize: 13,
    fontWeight: '600',
  },
  refreshMsg: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  unitLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentedWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quietHoursBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quietHoursText: {
    fontSize: 11,
  },
});
