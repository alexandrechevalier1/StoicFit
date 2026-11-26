import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CompletedSeance } from '../models';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, TOUCH_TARGET, typography } from '../theme/tokens';
import { pluralize } from '../utils/confirm';
import { getLocalDateKey } from '../utils/nutritionDate';
import { IconButton } from './ui';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MAX_DOTS = 3;

const pad2 = (n: number) => String(n).padStart(2, '0');

type Props = {
  history: CompletedSeance[];
  /** Jour mis en avant (feuille de détail ouverte). */
  selectedDateKey?: string | null;
  onSelectDay: (dateKey: string) => void;
};

/**
 * Calendrier mensuel des séances : un point par séance effectuée.
 * Toucher un jour avec des points ouvre le détail de ses séances.
 */
export default function WorkoutCalendar({ history, selectedDateKey, onSelectDay }: Props) {
  const colors = useThemeColors();
  const todayKey = getLocalDateKey();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const seanceCountByDay = useMemo(() => {
    const counts = new Map<string, number>();
    history.forEach((seance) => counts.set(seance.dateKey, (counts.get(seance.dateKey) ?? 0) + 1));
    return counts;
  }, [history]);

  const { year, month } = cursor;
  const monthPrefix = `${year}-${pad2(month + 1)}-`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // lundi en premier

  const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(`${monthPrefix}${pad2(day)}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthSeanceCount = history.filter((seance) => seance.dateKey.startsWith(monthPrefix)).length;
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const isCurrentMonth = todayKey.startsWith(monthPrefix);

  const goToMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[typography.headline, styles.capitalize, { color: colors.text }]}>{monthLabel}</Text>
          <Text style={[typography.caption, { color: colors.subtleText }]}>
            {monthSeanceCount > 0 ? pluralize(monthSeanceCount, 'séance') : 'Aucune séance ce mois-ci'}
          </Text>
        </View>
        <IconButton icon="chevron-back" label="Mois précédent" variant="tinted" size={36} onPress={() => goToMonth(-1)} />
        <IconButton
          icon="chevron-forward"
          label="Mois suivant"
          variant="tinted"
          size={36}
          disabled={isCurrentMonth}
          onPress={() => goToMonth(1)}
        />
      </View>

      <View style={styles.row}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={`weekday-${index}`} style={[typography.captionStrong, styles.weekday, { color: colors.subtleText }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((dateKey, index) => {
          if (!dateKey) return <View key={`blank-${index}`} style={styles.cell} />;

          const count = seanceCountByDay.get(dateKey) ?? 0;
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDateKey;
          const isFuture = dateKey > todayKey;
          const day = Number(dateKey.slice(8));

          const circleColor = isSelected ? colors.primary : isToday ? colors.primarySoft : 'transparent';
          const numberColor = isSelected
            ? colors.onPrimary
            : isToday
              ? colors.primary
              : isFuture
                ? colors.subtleText
                : colors.text;

          return (
            <Pressable
              key={dateKey}
              disabled={count === 0}
              onPress={() => onSelectDay(dateKey)}
              accessibilityRole={count > 0 ? 'button' : undefined}
              accessibilityLabel={`${day}${count > 0 ? `, ${pluralize(count, 'séance')}` : ''}`}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]}
            >
              <View style={[styles.dayCircle, { backgroundColor: circleColor }]}>
                <Text
                  style={[
                    count > 0 || isToday ? typography.captionStrong : typography.caption,
                    styles.dayNumber,
                    { color: numberColor },
                  ]}
                >
                  {day}
                </Text>
              </View>
              <View style={styles.dots}>
                {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, dotIndex) => (
                  <View key={dotIndex} style={[styles.dot, { backgroundColor: colors.primary }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL_WIDTH = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  headerText: { flex: 1, gap: 2 },
  capitalize: { textTransform: 'capitalize' },
  row: { flexDirection: 'row' },
  weekday: { width: CELL_WIDTH, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_WIDTH, height: TOUCH_TARGET + spacing.xs, alignItems: 'center', paddingTop: 2 },
  dayCircle: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: radius.pill },
});
