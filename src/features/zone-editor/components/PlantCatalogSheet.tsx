import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react-native';
import { api } from '@/src/lib/api';
import { CATEGORY_EMOJI, PLANT_CATEGORY_LABEL } from '@/src/lib/zone-labels';
import { useZoneEditorStore } from '../store';

export type CatalogTheme = { pn: string; bg: string; tx: string; mu: string; bd: string; ac: string; danger: string };
const FILTERS = ['ALL', 'VEGETABLE', 'TREE', 'FLOWER', 'SHRUB', 'BERRY', 'HERB', 'OTHER'] as const;
const FL: Record<string, string> = { ALL: 'Усі', VEGETABLE: 'Овочі', TREE: 'Дерева', FLOWER: 'Квіти', SHRUB: 'Кущі', BERRY: 'Ягоди', HERB: 'Зелень', OTHER: 'Інше' };

export function PlantCatalogSheet({ open, onClose, onCreateCustom, theme, centerMeters }: { open: boolean; onClose: () => void; onCreateCustom: () => void; theme: CatalogTheme; centerMeters: { x: number; y: number } }) {
  const catalog = useZoneEditorStore((s) => s.catalog);
  const setCatalog = useZoneEditorStore((s) => s.setCatalog);
  const add = useZoneEditorStore((s) => s.addPlantFromType);
  const query = useQuery({
    queryKey: ['plant-types', 'editor', catalog.category, catalog.q],
    queryFn: () => api.listPlantTypes({ q: catalog.q || undefined, category: catalog.category === 'ALL' ? undefined : catalog.category, limit: 50 }),
    staleTime: 60_000,
  });
  const items = useMemo(() => query.data?.data ?? [], [query.data]);
  const shown = catalog.tab === 'mine' ? items.filter((t) => t.ownerId) : items;
  const total = query.data?.meta.total ?? shown.length;
  const onAdd = (type: { id: string }) => {
    const full = items.find((t) => t.id === type.id);
    if (!full) {
      return;
    }
    add(full, centerMeters);
    onClose();
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.overlay} onPress={onClose} />
      <View style={[st.sheet, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
        <View style={st.header}>
          <Text style={[st.title, { color: theme.tx }]}>Каталог рослин</Text>
          <Pressable hitSlop={10} onPress={onClose}><X size={20} color={theme.mu} /></Pressable>
        </View>
        <View style={[st.searchRow, { borderColor: theme.bd, backgroundColor: theme.bg }]}>
          <Search size={16} color={theme.mu} />
          <TextInput style={[st.searchInput, { color: theme.tx }]} placeholder="Пошук за назвою" placeholderTextColor={theme.mu} value={catalog.q} onChangeText={(q) => setCatalog({ q })} />
        </View>
        <View style={st.tabs}>
          {(['catalog', 'mine'] as const).map((tab) => (
            <Pressable key={tab} onPress={() => setCatalog({ tab })} style={[st.tab, { backgroundColor: catalog.tab === tab ? theme.ac : theme.bg, borderColor: theme.bd }]}>
              <Text style={[st.tabText, { color: catalog.tab === tab ? '#fff' : theme.tx }]}>{tab === 'catalog' ? 'Базові' : 'Мої'}</Text>
            </Pressable>
          ))}
          <Text style={[st.count, { color: theme.mu }]}>Типів: {total}</Text>
        </View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={(c) => c} contentContainerStyle={st.filters} renderItem={({ item }) => (
          <Pressable onPress={() => setCatalog({ category: item })} style={[st.chip, { backgroundColor: catalog.category === item ? theme.ac : theme.bg, borderColor: theme.bd }]}>
            <Text style={[st.chipText, { color: catalog.category === item ? '#fff' : theme.tx }]}>{FL[item]}</Text>
          </Pressable>
        )} />
        <CatalogBody shown={shown} loading={query.isLoading} error={query.isError} onAdd={onAdd} theme={theme} />
        <Pressable onPress={onCreateCustom} style={[st.createBtn, { borderColor: theme.bd, backgroundColor: theme.bg }]}>
          <Text style={[st.createText, { color: theme.ac }]}>Створити власний тип</Text>
        </Pressable>
      </View>
    </Modal>
  );
}


function CatalogBody({ shown, loading, error, onAdd, theme }: { shown: { id: string; name: string; category: string }[]; loading: boolean; error: boolean; onAdd: (t: { id: string; name: string; category: string }) => void; theme: { bd: string; bg: string; tx: string; mu: string; ac: string } }) {
  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator color={theme.ac} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={st.center}>
        <Text style={[st.muted, { color: theme.mu }]}>Не вдалося завантажити каталог</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={shown}
      keyExtractor={(t) => t.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 12 }}
      renderItem={({ item }) => (
        <View style={[st.row, { borderColor: theme.bd, backgroundColor: theme.bg }]}>
          <Text style={st.icon}>{CATEGORY_EMOJI[item.category] ?? '🌱'}</Text>
          <View style={st.rowInfo}>
            <Text style={[st.rowName, { color: theme.tx }]}>{item.name}</Text>
            <Text style={[st.rowCat, { color: theme.mu }]}>
              {PLANT_CATEGORY_LABEL[item.category] ?? item.category}
            </Text>
          </View>
          <Pressable onPress={() => onAdd(item)} style={[st.addBtn, { backgroundColor: theme.ac }]}>
            <Plus size={16} color="#fff" />
          </Pressable>
        </View>
      )}
    />
  );
}

const st = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tab: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tabText: { fontSize: 13, fontWeight: '700' },
  count: { fontSize: 12, marginLeft: 'auto' },
  filters: { gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  center: { alignItems: 'center', paddingVertical: 32 },
  muted: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 8 },
  icon: { fontSize: 22 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowCat: { fontSize: 12, marginTop: 2 },
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  createBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  createText: { fontSize: 14, fontWeight: '700' },
});
