import { StyleSheet, Text, View } from 'react-native';
import type { WeeklyNutritionSummary } from '../models';
import { getLocalDateKey, parseLocalDateKey } from '../utils/nutritionDate';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/tokens';
import { formatInteger, formatWeight } from '../utils/format';

type Props = {
  summary: WeeklyNutritionSummary;
};

export default function NutritionWeeklySummary({ summary }: Props) {
  const colors = useThemeColors();
  const todayKey = getLocalDateKey();
  const loggedDays = summary.days.filter((day) => day.totals.calories > 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.headline, { color: colors.text }]}>Semaine</Text>
        <Text style={[typography.caption, { color: colors.subtleText }]}>
          {formatRange(summary.startDateKey, summary.endDateKey)}
        </Text>
      </View>

      <View style={styles.daysRow}>
        {summary.days.map((day) => {
          const hasData = day.totals.calories > 0;
          const ratio = Math.min(1, day.totals.calories / Math.max(1, day.goals.calories));
          const barColor = day.isCaloriesGoalMet
            ? colors.success
            : day.totals.calories > day.goals.calories
              ? colors.warning
              : colors.primary;
          const isToday = day.dateKey === todayKey;
          return (
            <View key={day.dateKey} style={styles.dayColumn}>
              <Text style={[styles.dayValue, { color: hasData ? colors.text : 'transparent' }]}>
                {formatWeight(Math.round(day.totals.calories / 100) / 10)}k
              </Text>
              <View style={[styles.barTrack, { backgroundColor: colors.cardMuted }]}>
                {hasData ? (
                  <View style={[styles.barFill, { height: `${Math.max(8, ratio * 100)}%`, backgroundColor: barColor }]} />
                ) : null}
              </View>
              <Text
                style={[
                  typography.captionStrong,
                  styles.dayLabel,
                  { color: isToday ? colors.primary : colors.subtleText },
                ]}
              >
                {formatShortDay(day.dateKey)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem color={colors.success} label="Objectif atteint" />
        <LegendItem color={colors.warning} label="Dépassé" />
        <LegendItem color={colors.primary} label="En dessous" />
      </View>

      {loggedDays.length > 0 ? (
        <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
          <Metric label="Moyenne / jour" value={`${formatInteger(summary.averages.calories)} kcal`} />
          <Metric label="Protéines" value={`${formatInteger(summary.totals.proteinG)} g`} />
          <Metric label="Jours suivis" value={`${loggedDays.length} / 7`} />
        </View>
      ) : (
        <Text style={[typography.caption, { color: colors.subtleText }]}>
          Aucun repas enregistré cette semaine.
        </Text>
      )}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[typography.caption, { color: colors.subtleText }]}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.metric}>
      <Text style={[typography.number, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.subtleText }]}>{label}</Text>
    </View>
  );
}

function formatShortDay(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase();
}

function formatRange(startDateKey: string, endDateKey: string): string {
  const options = { day: 'numeric', month: 'short' } as const;
  const start = parseLocalDateKey(startDateKey).toLocaleDateString('fr-FR', options);
  const end = parseLocalDateKey(endDateKey).toLocaleDateString('fr-FR', options);
  return `${start} – ${end}`;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  daysRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 128 },
  dayColumn: { flex: 1, alignItems: 'center', height: '100%', gap: spacing.xs },
  dayValue: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dayLabel: { fontSize: 12 },
  barTrack: { flex: 1, width: '70%', maxWidth: 22, borderRadius: radius.sm, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: radius.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  metric: { gap: 2 },
});
