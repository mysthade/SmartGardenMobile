import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  X,
  Search,
  Navigation,
  Compass,
  MapPin,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import type { ResolvedLocation, GeocodingResult } from '../types';
import {
  searchOpenMeteoGeocoding,
  searchNominatimGeocoding,
  resolveGpsLocation,
  parseManualCoordinates,
} from '../lib/location';
import { useWeatherStore } from '../lib/weather-store';

interface LocationSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: ResolvedLocation) => void;
}

type TabType = 'search' | 'gps' | 'coords' | 'saved';

export function LocationSelectModal({
  visible,
  onClose,
  onLocationSelected,
}: LocationSelectModalProps) {
  const { theme } = useTheme();
  const {
    settings,
    activeLocation,
    addSavedLocation,
    removeSavedLocation,
    renameSavedLocation,
  } = useWeatherStore();

  const [activeTab, setActiveTab] = useState<TabType>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [triedNominatim, setTriedNominatim] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // GPS state
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [resolvedGpsLocation, setResolvedGpsLocation] = useState<ResolvedLocation | null>(null);

  // Manual Coords state
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [coordsError, setCoordsError] = useState<string | null>(null);

  // Rename modal state
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editLabelText, setEditLabelText] = useState('');

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'search') return;

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setTriedNominatim(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const omResults = await searchOpenMeteoGeocoding(trimmed, controller.signal);
        if (omResults.length > 0) {
          setSearchResults(omResults);
          setTriedNominatim(false);
        } else {
          // If 0 results, query Nominatim for rare villages
          setTriedNominatim(true);
          const nomResults = await searchNominatimGeocoding(trimmed, controller.signal);
          setSearchResults(nomResults);
          if (nomResults.length === 0) {
            setSearchError('Нічого не знайдено. Перевірте написання або введіть координати вручну.');
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setSearchError('Помилка пошуку. Перевірте зʼєднання.');
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, activeTab]);

  const handleSelectGeocodingItem = async (item: GeocodingResult) => {
    const loc: ResolvedLocation = {
      id: `manual_${item.latitude.toFixed(4)}_${item.longitude.toFixed(4)}`,
      name: item.name,
      admin1: item.admin1,
      admin2: item.admin2,
      country: item.country || 'Україна',
      countryCode: item.countryCode,
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone,
      source: 'manual',
      isIpEstimate: false,
      updatedAt: Date.now(),
    };

    await addSavedLocation(loc);
    onLocationSelected(loc);
    onClose();
  };

  const handleTriggerGps = async () => {
    setIsGpsLoading(true);
    setGpsError(null);
    setResolvedGpsLocation(null);

    const res = await resolveGpsLocation();
    setIsGpsLoading(false);

    if (res.error || !res.location) {
      setGpsError(res.error || 'Не вдалося отримати GPS-координати');
    } else {
      setResolvedGpsLocation(res.location);
    }
  };

  const handleApplyGps = async () => {
    if (!resolvedGpsLocation) return;
    await addSavedLocation(resolvedGpsLocation);
    onLocationSelected(resolvedGpsLocation);
    onClose();
  };

  const handleApplyCoords = async () => {
    setCoordsError(null);
    const parsed = parseManualCoordinates(latInput, lonInput, customNameInput);
    if (parsed.error || !parsed.location) {
      setCoordsError(parsed.error || 'Некоректні координати');
      return;
    }

    await addSavedLocation(parsed.location);
    onLocationSelected(parsed.location);
    onClose();
  };

  const handleStartRename = (loc: ResolvedLocation) => {
    setEditingLocationId(loc.id);
    setEditLabelText(loc.customLabel || loc.name);
  };

  const handleSaveRename = async () => {
    if (!editingLocationId) return;
    await renameSavedLocation(editingLocationId, editLabelText.trim());
    setEditingLocationId(null);
  };

  const handleDeleteSaved = (loc: ResolvedLocation) => {
    Alert.alert(
      'Видалити місце?',
      `Видалити «${loc.customLabel || loc.name}» зі збережених?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: () => void removeSavedLocation(loc.id),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.bg, borderColor: theme.bd }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
              Вибір місця
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

          {/* Navigation Tabs */}
          <View style={[styles.tabBar, { borderColor: theme.bd }]}>
            <Pressable
              style={[
                styles.tabItem,
                activeTab === 'search' && [styles.tabItemActive, { borderBottomColor: theme.ac }],
              ]}
              onPress={() => setActiveTab('search')}
            >
              <Search size={16} color={activeTab === 'search' ? theme.ac : theme.mu} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'search' ? theme.ac : theme.mu },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Пошук
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabItem,
                activeTab === 'gps' && [styles.tabItemActive, { borderBottomColor: theme.ac }],
              ]}
              onPress={() => setActiveTab('gps')}
            >
              <Navigation size={16} color={activeTab === 'gps' ? theme.ac : theme.mu} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'gps' ? theme.ac : theme.mu },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                GPS
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabItem,
                activeTab === 'coords' && [styles.tabItemActive, { borderBottomColor: theme.ac }],
              ]}
              onPress={() => setActiveTab('coords')}
            >
              <Compass size={16} color={activeTab === 'coords' ? theme.ac : theme.mu} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'coords' ? theme.ac : theme.mu },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Координати
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabItem,
                activeTab === 'saved' && [styles.tabItemActive, { borderBottomColor: theme.ac }],
              ]}
              onPress={() => setActiveTab('saved')}
            >
              <MapPin size={16} color={activeTab === 'saved' ? theme.ac : theme.mu} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'saved' ? theme.ac : theme.mu },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Збережені ({settings.savedLocations.length})
              </Text>
            </Pressable>
          </View>

          {/* TAB 1: SEARCH */}
          {activeTab === 'search' && (
            <View style={styles.tabContent}>
              <View style={[styles.searchInputWrap, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
                <Search size={18} color={theme.mu} />
                <TextInput
                  style={[styles.searchInput, { color: theme.tx }]}
                  placeholder="Введіть назву міста, смт або села..."
                  placeholderTextColor={theme.mu}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                    <X size={16} color={theme.mu} />
                  </Pressable>
                )}
              </View>

              {isSearching && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={theme.ac} />
                  <Text style={[styles.loadingText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                    {triedNominatim ? 'Пошук у базі OpenStreetMap...' : 'Шукаємо населений пункт...'}
                  </Text>
                </View>
              )}

              {searchError && !isSearching && (
                <View style={styles.messageBox}>
                  <AlertCircle size={18} color="#E74C3C" />
                  <Text style={[styles.errorText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                    {searchError}
                  </Text>
                </View>
              )}

              <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
                {searchResults.map((item) => {
                  const regionText = [item.admin2, item.admin1, item.country].filter(Boolean).join(', ');
                  const isNominatim = item.source === 'nominatim';

                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.resultCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}
                      onPress={() => void handleSelectGeocodingItem(item)}
                      accessibilityRole="button"
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.resultTitleRow}>
                          <Text
                            style={[styles.resultName, { color: theme.tx }]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.3}
                          >
                            {item.name}
                          </Text>
                          <View
                            style={[
                              styles.sourceTag,
                              { backgroundColor: isNominatim ? '#e8f8f5' : '#fef5e7' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.sourceTagText,
                                { color: isNominatim ? '#16a085' : '#d35400' },
                              ]}
                            >
                              {isNominatim ? 'OpenStreetMap' : 'Open-Meteo'}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.resultRegion, { color: theme.mu }]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.3}
                        >
                          {regionText}
                        </Text>
                        <Text style={[styles.resultCoords, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                          {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
                          {item.population ? ` • ~${item.population.toLocaleString('uk-UA')} жителів` : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* TAB 2: GPS */}
          {activeTab === 'gps' && (
            <View style={styles.tabContent}>
              <View style={styles.gpsContainer}>
                <View style={[styles.gpsIconCircle, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
                  <Navigation size={36} color={theme.ac} />
                </View>

                <Text style={[styles.gpsTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                  Визначення через GPS
                </Text>
                <Text style={[styles.gpsDesc, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                  Отримайте точні координати вашого садового пристрою або поточної ділянки. Застосунок
                  використовує збалансовану точність.
                </Text>

                <Pressable
                  style={[styles.gpsButton, { backgroundColor: theme.ac }]}
                  onPress={handleTriggerGps}
                  disabled={isGpsLoading}
                >
                  {isGpsLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Navigation size={18} color="#ffffff" />
                      <Text style={styles.gpsButtonText} maxFontSizeMultiplier={1.3}>
                        Визначити поточне місце
                      </Text>
                    </>
                  )}
                </Pressable>

                {gpsError && (
                  <View style={styles.messageBox}>
                    <AlertCircle size={18} color="#E74C3C" />
                    <Text style={[styles.errorText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                      {gpsError}
                    </Text>
                  </View>
                )}

                {resolvedGpsLocation && (
                  <View style={[styles.resolvedCard, { backgroundColor: theme.pn, borderColor: theme.ac }]}>
                    <Text style={[styles.resolvedTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                      Знайдено: {resolvedGpsLocation.name}
                    </Text>
                    <Text style={[styles.resolvedCoords, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                      {resolvedGpsLocation.latitude.toFixed(4)}, {resolvedGpsLocation.longitude.toFixed(4)}
                      {resolvedGpsLocation.admin1 ? ` (${resolvedGpsLocation.admin1})` : ''}
                    </Text>

                    <Pressable
                      style={[styles.applyButton, { backgroundColor: theme.ac }]}
                      onPress={handleApplyGps}
                    >
                      <Check size={18} color="#ffffff" />
                      <Text style={styles.applyButtonText} maxFontSizeMultiplier={1.3}>
                        Вибрати це місце
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 3: COORDINATES */}
          {activeTab === 'coords' && (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                Ввід координат вручну
              </Text>
              <Text style={[styles.formHint, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                Підтримуються крапки і коми (наприклад 50.45 або 50,45). Можна скопіювати з Google Maps або
                Apple Maps.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputSubLabel, { color: theme.mu }]}>Широта (Latitude: −90…90)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.pn, borderColor: theme.bd, color: theme.tx }]}
                  placeholder="Наприклад: 50.4501 або 50,45"
                  placeholderTextColor={theme.mu}
                  value={latInput}
                  onChangeText={setLatInput}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputSubLabel, { color: theme.mu }]}>Довгота (Longitude: −180…180)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.pn, borderColor: theme.bd, color: theme.tx }]}
                  placeholder="Наприклад: 30.5234 або 30,52"
                  placeholderTextColor={theme.mu}
                  value={lonInput}
                  onChangeText={setLonInput}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputSubLabel, { color: theme.mu }]}>Власна назва ділянки (необовʼязково)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.pn, borderColor: theme.bd, color: theme.tx }]}
                  placeholder="Наприклад: Дача біля лісу / Сад №2"
                  placeholderTextColor={theme.mu}
                  value={customNameInput}
                  onChangeText={setCustomNameInput}
                />
              </View>

              {coordsError && (
                <View style={styles.messageBox}>
                  <AlertCircle size={18} color="#E74C3C" />
                  <Text style={[styles.errorText, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                    {coordsError}
                  </Text>
                </View>
              )}

              <Pressable
                style={[styles.applyButton, { backgroundColor: theme.ac, marginTop: 16 }]}
                onPress={handleApplyCoords}
              >
                <Check size={18} color="#ffffff" />
                <Text style={styles.applyButtonText} maxFontSizeMultiplier={1.3}>
                  Застосувати координати
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {/* TAB 4: SAVED LOCATIONS */}
          {activeTab === 'saved' && (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
              {settings.savedLocations.length === 0 ? (
                <View style={styles.emptySavedBox}>
                  <MapPin size={32} color={theme.mu} />
                  <Text style={[styles.emptySavedText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                    Немає збережених місць. Знайдіть місце в пошуку або введіть координати.
                  </Text>
                </View>
              ) : (
                settings.savedLocations.map((loc) => {
                  const isCurrent = activeLocation?.id === loc.id;
                  const isEditing = editingLocationId === loc.id;

                  return (
                    <View
                      key={loc.id}
                      style={[
                        styles.savedCard,
                        {
                          backgroundColor: theme.pn,
                          borderColor: isCurrent ? theme.ac : theme.bd,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        {isEditing ? (
                          <View style={styles.renameRow}>
                            <TextInput
                              style={[
                                styles.renameInput,
                                { backgroundColor: theme.bg, borderColor: theme.bd, color: theme.tx },
                              ]}
                              value={editLabelText}
                              onChangeText={setEditLabelText}
                              autoFocus
                            />
                            <Pressable
                              style={[styles.saveRenameBtn, { backgroundColor: theme.ac }]}
                              onPress={handleSaveRename}
                            >
                              <Check size={16} color="#ffffff" />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => {
                              onLocationSelected(loc);
                              onClose();
                            }}
                          >
                            <Text
                              style={[
                                styles.savedName,
                                { color: theme.tx, fontWeight: isCurrent ? '800' : '600' },
                              ]}
                              numberOfLines={1}
                              maxFontSizeMultiplier={1.3}
                            >
                              {loc.customLabel || loc.name}
                              {isCurrent ? ' (Поточне)' : ''}
                            </Text>
                            <Text style={[styles.savedCoords, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                              {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
                              {loc.admin1 ? ` • ${loc.admin1}` : ''}
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      <View style={styles.savedActions}>
                        <Pressable
                          style={styles.actionBtn}
                          onPress={() => handleStartRename(loc)}
                          hitSlop={8}
                        >
                          <Edit2 size={16} color={theme.mu} />
                        </Pressable>

                        <Pressable
                          style={styles.actionBtn}
                          onPress={() => handleDeleteSaved(loc)}
                          hitSlop={8}
                        >
                          <Trash2 size={16} color="#E74C3C" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '85%',
    minHeight: 460,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 44,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDEDEC',
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  resultsList: {
    flex: 1,
  },
  resultCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  resultTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sourceTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  resultRegion: {
    fontSize: 13,
    marginTop: 2,
  },
  resultCoords: {
    fontSize: 11,
    marginTop: 4,
  },
  gpsContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  gpsIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gpsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  gpsDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 48,
  },
  gpsButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resolvedCard: {
    marginTop: 20,
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  resolvedTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  resolvedCoords: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    minHeight: 46,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  formHint: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  emptySavedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptySavedText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  savedName: {
    fontSize: 15,
  },
  savedCoords: {
    fontSize: 12,
    marginTop: 2,
  },
  savedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  actionBtn: {
    padding: 6,
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renameInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  saveRenameBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
