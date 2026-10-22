import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import type { ThemeTokens } from '@/src/theme/tokens';
import type { HarvestReminderItem } from '../types';

interface ReadyToHarvestBannerProps {
  reminders: HarvestReminderItem[];
  theme: ThemeTokens;
  onQuickHarvest: (reminder: HarvestReminderItem) => void;
}

function ReadyToHarvestBannerInner({
  reminders,
  theme,
  onQuickHarvest,
}: ReadyToHarvestBannerProps) {
  if (reminders.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.name === 'dark' ? '#261b11' : '#fef5e7',
          borderColor: theme.bd,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Bell size={18} color="#D35400" />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.tx }]}>Час збирати урожай</Text>
            <Text style={[styles.subtitle, { color: theme.mu }]}>
              {reminders.length === 1 ? '1 культура готова до збору' : `${reminders.length} культур готові до збору`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.itemsList}>
        {reminders.slice(0, 3).map((item) => (
          <Pressable
            key={item.plantId}
            style={[styles.reminderCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}
            onPress={() => onQuickHarvest(item)}
            accessibilityRole="button"
            accessibilityLabel={`Зібрати ${item.plantName}`}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={[styles.plantName, { color: theme.tx }]}>{item.plantName}</Text>
                <View
                  style={[
                    styles.urgencyBadge,
                    {
                      backgroundColor: item.urgency === 'HIGH' ? '#fdebd0' : '#eaf6ee',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.urgencyText,
                      { color: item.urgency === 'HIGH' ? '#D35400' : theme.ac },
                    ]}
                  >
                    {item.urgency === 'HIGH' ? 'Терміново' : 'Стиглий'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.reminderMessage, { color: theme.mu }]}>{item.message}</Text>
            </View>

            <View style={[styles.quickCollectBtn, { backgroundColor: theme.ac }]}>
              <Text style={styles.quickCollectText}>Зібрати</Text>
              <ChevronRight size={14} color="#ffffff" />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const ReadyToHarvestBanner = memo(ReadyToHarvestBannerInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  itemsList: {
    gap: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plantName: {
    fontSize: 14,
    fontWeight: '700',
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reminderMessage: {
    fontSize: 12,
    marginTop: 3,
  },
  quickCollectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  quickCollectText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
