import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';

type Props = {
  /** Date au format YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
};

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CELL_WIDTH = '14.28%';

const pad2 = (n: number) => String(n).padStart(2, '0');

export const formatDateString = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseDateString = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
};

const formatFrenchDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export default function DatePicker({ value, onChange }: Props) {
  const colors = useThemeColors();
  const today = new Date();
  const todayString = formatDateString(today);
  const [cursor, setCursor] = useState<Date>(() => {
    const parsed = parseDateString(value);
    const reference = parsed ?? today;
    return new Date(reference.getFullYear(), reference.getMonth(), 1, 12, 0, 0, 0);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // lundi en premier

  const cells: (string | null)[] = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad2(month + 1)}-${pad2(day)}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const goToMonth = (delta: number) => {
    setCursor(new Date(year, month + delta, 1, 12, 0, 0, 0));
  };

  const goToToday = () => {
    onChange(todayString);
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0));
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => goToMonth(-1)}
          hitSlop={10}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
        >
          <Text style={[styles.navButtonText, { color: colors.primary }]}>‹</Text>
        </Pressable>

        <Text style={[styles.monthLabel, { color: colors.text }]}>
          {MONTH_NAMES[month]} {year}
        </Text>

        <Pressable
          onPress={() => goToMonth(1)}
          hitSlop={10}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
        >
          <Text style={[styles.navButtonText, { color: colors.primary }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text
            key={`weekday-${index}`}
            style={[styles.weekDayLabel, { color: colors.subtleText }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) {
            return <View key={`blank-${index}`} style={styles.cell} />;
          }

          const isSelected = cell === value;
          const isToday = !isSelected && cell === todayString;

          return (
            <Pressable
              key={cell}
              onPress={() => onChange(cell)}
              accessibilityRole="button"
              accessibilityLabel={formatFrenchDate(cell)}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.cell,
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                isToday && { borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  { color: isSelected ? '#fff' : colors.text },
                  !isSelected && isToday && { fontWeight: '700' },
                ]}
              >
                {Number(cell.slice(8))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={goToToday}
        hitSlop={8}
        style={[styles.todayButton, { borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Sélectionner aujourd'hui"
      >
        <Text style={[styles.todayButtonText, { color: colors.primary }]}>Aujourd'hui</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: { fontSize: 26, fontWeight: '600', lineHeight: 28 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDayLabel: {
    width: CELL_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL_WIDTH,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellText: { fontSize: 15, fontWeight: '500' },
  todayButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  todayButtonText: { fontSize: 14, fontWeight: '600' },
});
