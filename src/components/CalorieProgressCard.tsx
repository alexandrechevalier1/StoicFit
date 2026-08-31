import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';

type Props = {
  consumedCalories: number;
  targetCalories: number;
};

export default function CalorieProgressCard({ consumedCalories, targetCalories }: Props) {
  const colors = useThemeColors();
  const rangeMin = Math.round(targetCalories * 0.9);
  const rangeMax = Math.round(targetCalories * 1.1);
  const barMax = Math.round(targetCalories * 1.3);

  const fillPercent = Math.min(100, (consumedCalories / barMax) * 100);
  const markerPercent = Math.min(100, (targetCalories / barMax) * 100);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.consumedValue, { color: colors.text }]}>{consumedCalories}</Text>
          <Text style={[styles.consumedLabel, { color: colors.subtleText }]}>kcal</Text>
        </View>

        <View style={styles.infoColumn}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🎯</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>{targetCalories} kcal</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>◐</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              {rangeMin} - {rangeMax}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${fillPercent}%`, backgroundColor: colors.primary }]} />
        <View style={[styles.barMarker, { left: `${markerPercent}%`, backgroundColor: colors.background, borderColor: colors.primary }]} />
      </View>
      <View style={styles.barLabelsRow}>
        <Text style={[styles.barLabel, { color: colors.subtleText }]}>0</Text>
        <Text style={[styles.barLabel, { color: colors.subtleText }]}>{barMax}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  consumedValue: { fontSize: 44, fontWeight: 'bold' },
  consumedLabel: { fontSize: 14, color: '#888', marginTop: -2 },
  infoColumn: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: 14, fontWeight: '600' },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E1E1E6',
    overflow: 'visible',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  barMarker: {
    position: 'absolute',
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#007AFF',
    marginLeft: -9,
  },
  barLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  barLabel: { fontSize: 12, color: '#888' },
});
