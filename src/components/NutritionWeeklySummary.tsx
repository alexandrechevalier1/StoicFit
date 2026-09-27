import { StyleSheet, Text, View } from 'react-native';
import type { WeeklyNutritionSummary } from '../models';
import { parseLocalDateKey } from '../utils/nutritionDate';
import { useThemeColors } from '../theme/useThemeColors';

type Props = {
  summary: WeeklyNutritionSummary;
};

export default function NutritionWeeklySummary({ summary }: Props) {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Semaine</Text>
        <Text style={[styles.subtitle, { color: colors.subtleText }]}>
          {formatRange(summary.startDateKey, summary.endDateKey)}
        </Text>
      </View>

      <View style={styles.daysRow}>
        {summary.days.map((day) => {
          const caloriesRatio = Math.min(1, day.totals.calories / Math.max(1, day.goals.calories));
          const statusColor = day.isCaloriesGoalMet ? '#2DBD6E' : day.totals.calories > day.goals.calories ? '#F59E0B' : '#D9534F';
          return (
            <View key={day.dateKey} style={styles.dayColumn}>
              <Text style={[styles.dayLabel, { color: colors.subtleText }]}>{formatShortDay(day.dateKey)}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(6, caloriesRatio * 100)}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayCalories, { color: colors.text }]}>{day.totals.calories}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.metricsGrid}>
        <Metric label="Moy. kcal/j" value={summary.averages.calories} color={colors.text} />
        <Metric label="Prot. totales" value={summary.totals.proteinG} unit="g" color={colors.text} />
        <Metric label="Glucides" value={summary.totals.carbsG} unit="g" color={colors.text} />
        <Metric label="Lipides" value={summary.totals.fatG} unit="g" color={colors.text} />
      </View>
    </View>
  );
}

function Metric({ label, value, unit = '', color }: { label: string; value: number; unit?: string; color: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.metricCard, { borderColor: colors.border }]}>
      <Text style={[styles.metricValue, { color }]}>
        {value}
        {unit ? ` ${unit}` : ''}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.subtleText }]}>{label}</Text>
    </View>
  );
}

function formatShortDay(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3);
}

function formatRange(startDateKey: string, endDateKey: string): string {
  const start = parseLocalDateKey(startDateKey);
  const end = parseLocalDateKey(endDateKey);
  return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12 },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 120,
    marginBottom: 14,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  dayLabel: { fontSize: 11, marginBottom: 6, textTransform: 'capitalize' },
  dayCalories: { fontSize: 11, marginTop: 6, fontWeight: '700' },
  barTrack: {
    flex: 1,
    width: 18,
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 9,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  metricValue: { fontSize: 18, fontWeight: '700' },
  metricLabel: { fontSize: 11, marginTop: 2 },
});
