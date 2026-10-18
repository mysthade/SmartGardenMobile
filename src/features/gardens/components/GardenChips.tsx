import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2, Trees } from 'lucide-react-native';
import type { GardenDto } from '@smart-garden/types';

type Theme = {
  ac: string;
  pn: string;
  bd: string;
  mu: string;
  tx: string;
};

type GardenChipsProps = {
  gardens: GardenDto[];
  activeGardenId?: string;
  theme: Theme;
  onSelectGarden: (id: string) => void;
  onDeleteGarden: (id: string, name: string) => void;
};

function GardenChipsInner({
  gardens,
  activeGardenId,
  theme,
  onSelectGarden,
  onDeleteGarden,
}: GardenChipsProps) {
  if (gardens.length === 0) return null;

  return (
    <View style={styles.selectorWrap}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={gardens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gardensList}
        renderItem={({ item }) => {
          const isSelected = item.id === activeGardenId;
          return (
            <Pressable
              style={[
                styles.gardenChip,
                {
                  backgroundColor: isSelected ? theme.ac : theme.pn,
                  borderColor: isSelected ? theme.ac : theme.bd,
                },
              ]}
              onPress={() => onSelectGarden(item.id)}
            >
              <Trees size={16} color={isSelected ? '#ffffff' : theme.mu} />
              <Text style={[styles.gardenChipText, { color: isSelected ? '#ffffff' : theme.tx }]}>
                {item.name}
              </Text>
              {isSelected && gardens.length > 1 ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => onDeleteGarden(item.id, item.name)}
                >
                  <Trash2 size={13} color="#ffffff" style={{ marginLeft: 4, opacity: 0.8 }} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  selectorWrap: { marginBottom: 14 },
  gardensList: { paddingHorizontal: 18, gap: 8 },
  gardenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  gardenChipText: { fontSize: 14, fontWeight: '600' },
});

export const GardenChips = memo(GardenChipsInner);
