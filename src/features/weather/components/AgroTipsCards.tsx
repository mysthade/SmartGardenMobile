import { StyleSheet, Text, View } from 'react-native';
import {
  Sparkles,
  Droplets,
  ThermometerSnowflake,
  Sun,
  Wind,
  CloudLightning,
  CloudRain,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/theme-context';
import type { AgroTip } from '../types';

interface AgroTipsCardsProps {
  tips: AgroTip[];
}

export function AgroTipsCards({ tips }: AgroTipsCardsProps) {
  const { theme } = useTheme();

  if (!tips || tips.length === 0) return null;

  const renderTipIcon = (tip: AgroTip) => {
    const size = 20;
    const color = tip.iconColor;

    switch (tip.type) {
      case 'frost':
        return <ThermometerSnowflake size={size} color={color} />;
      case 'heat':
        return <Sun size={size} color={color} />;
      case 'wind':
        return <Wind size={size} color={color} />;
      case 'storm':
        return <CloudLightning size={size} color={color} />;
      case 'rain':
        return <CloudRain size={size} color={color} />;
      case 'watering':
      default:
        return <Droplets size={size} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Sparkles size={18} color={theme.ac} />
        <Text style={[styles.sectionTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
          Садівничі поради на сьогодні
        </Text>
      </View>

      {tips.map((tip) => {
        const isAlert = tip.severity === 'alert';
        const isWarning = tip.severity === 'warning';

        return (
          <View
            key={tip.id}
            style={[
              styles.tipCard,
              {
                backgroundColor: theme.pn,
                borderColor: isAlert ? '#E74C3C' : isWarning ? '#E67E22' : theme.bd,
              },
            ]}
          >
            <View
              style={[
                styles.tipIconWrap,
                {
                  backgroundColor: theme.name === 'dark' ? tip.bgColorDark : tip.bgColorLight,
                },
              ]}
            >
              {renderTipIcon(tip)}
            </View>

            <View style={styles.tipContent}>
              <View style={styles.tipTitleRow}>
                <Text style={[styles.tipTitle, { color: theme.tx }]} maxFontSizeMultiplier={1.3}>
                  {tip.title}
                </Text>
                {isAlert && (
                  <View style={[styles.badgeAlert, { backgroundColor: '#FADBD8' }]}>
                    <ShieldAlert size={12} color="#C0392B" />
                    <Text style={styles.badgeAlertText} maxFontSizeMultiplier={1.3}>
                      Увага
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.tipText, { color: theme.mu }]} maxFontSizeMultiplier={1.3}>
                {tip.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  tipIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  badgeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C0392B',
  },
  tipText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
