import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/theme/theme-context';

export function WeatherSkeleton() {
  const { theme } = useTheme();
  const skeletonColor = theme.name === 'dark' ? '#1c2820' : '#e2e8e4';

  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={[styles.headerBox, { backgroundColor: skeletonColor }]} />
      <View style={[styles.subHeaderBox, { backgroundColor: skeletonColor }]} />

      {/* Main Card Skeleton */}
      <View
        style={[
          styles.mainCard,
          {
            backgroundColor: theme.name === 'dark' ? '#142219' : '#eaf6ee',
            borderColor: theme.bd,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={{ gap: 8 }}>
            <View style={[styles.pill, { backgroundColor: skeletonColor, width: 140 }]} />
            <View style={[styles.pill, { backgroundColor: skeletonColor, width: 90, height: 40 }]} />
            <View style={[styles.pill, { backgroundColor: skeletonColor, width: 160 }]} />
          </View>
          <View style={[styles.circle, { backgroundColor: skeletonColor }]} />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.bd }]} />
        <View style={styles.statsRow}>
          <View style={[styles.pill, { backgroundColor: skeletonColor, width: 60, height: 32 }]} />
          <View style={[styles.pill, { backgroundColor: skeletonColor, width: 60, height: 32 }]} />
          <View style={[styles.pill, { backgroundColor: skeletonColor, width: 60, height: 32 }]} />
        </View>
      </View>

      {/* Hourly Skeleton */}
      <View style={[styles.pill, { backgroundColor: skeletonColor, width: 180, marginBottom: 12 }]} />
      <View style={styles.hourlyRow}>
        {[1, 2, 3, 4].map((k) => (
          <View
            key={k}
            style={[
              styles.hourlyBox,
              { backgroundColor: theme.pn, borderColor: theme.bd },
            ]}
          >
            <View style={[styles.pill, { backgroundColor: skeletonColor, width: 36, height: 12 }]} />
            <View style={[styles.circleSmall, { backgroundColor: skeletonColor }]} />
            <View style={[styles.pill, { backgroundColor: skeletonColor, width: 32, height: 16 }]} />
          </View>
        ))}
      </View>

      {/* Tips Skeleton */}
      <View style={[styles.pill, { backgroundColor: skeletonColor, width: 220, marginVertical: 14 }]} />
      <View
        style={[
          styles.tipCard,
          { backgroundColor: theme.pn, borderColor: theme.bd },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: skeletonColor }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.pill, { backgroundColor: skeletonColor, width: 140 }]} />
          <View style={[styles.pill, { backgroundColor: skeletonColor, width: '100%', height: 12 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  headerBox: {
    width: 220,
    height: 28,
    borderRadius: 8,
    marginBottom: 6,
  },
  subHeaderBox: {
    width: 160,
    height: 16,
    borderRadius: 6,
    marginBottom: 16,
  },
  mainCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pill: {
    height: 16,
    borderRadius: 8,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  circleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginVertical: 6,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hourlyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  hourlyBox: {
    width: 72,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
});
