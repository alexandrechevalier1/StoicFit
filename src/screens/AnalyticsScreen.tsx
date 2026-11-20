import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompletedSeance, SetIntensity } from '../models';
import type { ProfilStackParamList } from '../navigation/RootNavigator';
import { useProgramStore } from '../store/programStore';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, SCREEN_PADDING, spacing, typography } from '../theme/tokens';
import { formatInteger, formatRelativeDay, formatWeight } from '../utils/format';
import { pluralize } from '../utils/confirm';
import { EmptyState, ScreenHeader } from '../components/ui';

type Props = NativeStackScreenProps<ProfilStackParamList, 'Analytics'>;

type PeriodFilter = 'all' | 'month' | 'year';

type PersonalRecord = {
  exerciseKey: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  at: string;
};

type WeeklyVolume = {
  weekKey: string;
  label: string;
  volumeKg: number;
};

type ExerciseTrendPoint = {
  key: string;
  label: string;
  value: number;
};

type ExerciseTrend = {
  key: string;
  name: string;
  seances: number;
  volumeKg: number;
  bestWeightKg: number;
  bestReps: number;
  points: ExerciseTrendPoint[];
};

type BarDatum = {
  key: string;
  label: string;
  value: number;
  color?: string;
  emphasized?: boolean;
};

type HorizontalDatum = {
  key: string;
  label: string;
  value: number;
  detail?: string;
};

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
];

const SEANCE_PROGRESS_MAX = 8;
const EXERCISE_TREND_MAX = 4;
const EXERCISE_POINTS_MAX = 10;
const VOLUME_BY_EXERCISE_MAX = 6;
const FREQUENCY_MONTHS = 8;

const MONTH_SHORT_LABELS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const INTENSITY_META: { key: SetIntensity; label: string }[] = [
  { key: 'faible', label: 'Faible' },
  { key: 'modere', label: 'Modéré' },
  { key: 'intense', label: 'Intense' },
];

const pad2 = (value: number) => String(value).padStart(2, '0');

const hbarWidth = (ratio: number): `${number}%` => {
  if (ratio <= 0) {
    return '0%';
  }
  return `${Math.min(100, Math.max(4, Math.round(ratio * 100)))}%`;
};

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sameYear(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear();
}

function inPeriod(dateIso: string, period: PeriodFilter, now: Date) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  if (period === 'month') return sameMonth(date, now);
  if (period === 'year') return sameYear(date, now);
  return true;
}

function getExerciseKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

function getWeekStart(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const offset = day === 0 ? 6 : day - 1;
  local.setDate(local.getDate() - offset);
  return local;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}

function formatShortDate(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}


function seanceVolume(seance: CompletedSeance, exerciseFilter: string) {
  return seance.exercises.reduce((exerciseSum, exercise) => {
    const key = getExerciseKey(exercise.name);
    if (exerciseFilter !== 'all' && key !== exerciseFilter) {
      return exerciseSum;
    }

    const setsVolume = exercise.sets.reduce((setSum, setItem) => {
      return setSum + setItem.weightKg * setItem.reps;
    }, 0);

    return exerciseSum + setsVolume;
  }, 0);
}

function matchesExercise(seance: CompletedSeance, exerciseFilter: string) {
  if (exerciseFilter === 'all') return true;
  return seance.exercises.some((exercise) => getExerciseKey(exercise.name) === exerciseFilter);
}

function seanceSeriesCount(seance: CompletedSeance) {
  return seance.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
}

function sortByDateAsc(a: CompletedSeance, b: CompletedSeance) {
  return new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime();
}

function computeRecords(history: CompletedSeance[], exerciseFilter: string) {
  const bestByExercise = new Map<string, PersonalRecord>();

  history
    .slice()
    .sort(sortByDateAsc)
    .forEach((seance) => {
      seance.exercises.forEach((exercise) => {
        const key = getExerciseKey(exercise.name);
        if (exerciseFilter !== 'all' && key !== exerciseFilter) {
          return;
        }

        exercise.sets.forEach((setItem) => {
          const current = bestByExercise.get(key);
          const isBetter =
            !current ||
            setItem.weightKg > current.weightKg ||
            (setItem.weightKg === current.weightKg && setItem.reps > current.reps);

          if (isBetter) {
            bestByExercise.set(key, {
              exerciseKey: key,
              exerciseName: exercise.name,
              weightKg: setItem.weightKg,
              reps: setItem.reps,
              at: setItem.performedAt,
            });
          }
        });
      });
    });

  return [...bestByExercise.values()].sort((a, b) => {
    if (b.weightKg !== a.weightKg) return b.weightKg - a.weightKg;
    return b.reps - a.reps;
  });
}

function computeWeeklyVolumes(history: CompletedSeance[], exerciseFilter: string) {
  const byWeek = new Map<string, number>();

  history.forEach((seance) => {
    const weekStart = getWeekStart(seance.endedAt);
    if (!weekStart) return;

    const weekKey = toDateKey(weekStart);
    const current = byWeek.get(weekKey) ?? 0;
    byWeek.set(weekKey, current + seanceVolume(seance, exerciseFilter));
  });

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([weekKey, volumeKg]) => ({
      weekKey,
      label: formatWeekLabel(weekKey),
      volumeKg,
    })) as WeeklyVolume[];
}

function BarChart({
  data,
  maxValue,
  height = 120,
  showValues = false,
  showLabels = true,
  minSlots = 6,
  formatValue,
}: {
  data: BarDatum[];
  maxValue: number;
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  /** Nombre minimal de colonnes : avec peu de données, les barres restent à gauche à taille normale. */
  minSlots?: number;
  formatValue?: (value: number) => string;
}) {
  const colors = useThemeColors();
  const hasEmphasis = data.some((item) => item.emphasized);
  const slotWidth = `${100 / Math.max(minSlots, data.length)}%` as const;

  return (
    <View style={styles.chartRow}>
      {data.map((item) => {
        const ratio = maxValue > 0 ? item.value / maxValue : 0;
        const barHeight = item.value > 0 ? Math.max(4, Math.round(ratio * height)) : 2;
        const isDimmed = hasEmphasis && !item.emphasized;

        return (
          <View key={item.key} style={[styles.barColumn, { width: slotWidth }]}>
            {showValues ? (
              <Text
                numberOfLines={1}
                style={[styles.barValue, { color: item.value > 0 ? colors.text : 'transparent' }]}
              >
                {formatValue ? formatValue(item.value) : String(item.value)}
              </Text>
            ) : null}
            <View style={[styles.barArea, { height }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: barHeight,
                    backgroundColor: item.value > 0 ? (item.color ?? colors.primary) : colors.cardMuted,
                    opacity: isDimmed ? 0.4 : 1,
                  },
                ]}
              />
            </View>
            {showLabels ? (
              <Text numberOfLines={1} style={[styles.barLabel, { color: colors.subtleText }]}>
                {item.label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function HorizontalBarList({
  data,
  maxValue,
  formatValue,
}: {
  data: HorizontalDatum[];
  maxValue: number;
  formatValue?: (value: number) => string;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.hbarList}>
      {data.map((item) => {
        const ratio = maxValue > 0 ? item.value / maxValue : 0;
        return (
          <View key={item.key} style={styles.hbarItem}>
            <View style={styles.hbarLabelRow}>
              <Text numberOfLines={1} style={[typography.bodyStrong, styles.flex, { color: colors.text }]}>
                {item.label}
              </Text>
              <Text numberOfLines={1} style={[typography.caption, styles.tabular, { color: colors.subtleText }]}>
                {formatValue ? formatValue(item.value) : String(item.value)}
                {item.detail ? ` · ${item.detail}` : ''}
              </Text>
            </View>
            <View style={[styles.hbarTrack, { backgroundColor: colors.cardMuted }]}>
              <View style={[styles.hbarFill, { width: hbarWidth(ratio), backgroundColor: colors.primary }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SectionCard({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  const colors = useThemeColors();

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Text style={[typography.headline, { color: colors.text }]}>{title}</Text>
        {caption ? <Text style={[typography.caption, { color: colors.subtleText }]}>{caption}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
      <Text style={[typography.number, styles.kpiValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.subtleText }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card }]}
    >
      <Text style={[typography.captionStrong, { color: active ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function formatDuration(totalMinutes: number) {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${pad2(rest)}` : `${hours} h`;
}

function formatKg(value: number) {
  return `${formatInteger(value)} kg`;
}

export default function AnalyticsScreen({ navigation }: Props) {
  const history = useWorkoutHistory();
  const setLogs = useProgramStore((state) => state.setLogs);
  const colors = useThemeColors();
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [exerciseFilter, setExerciseFilter] = useState<string>('all');

  const periodHistory = useMemo(() => {
    const now = new Date();
    return history.filter((entry) => inPeriod(entry.endedAt, period, now));
  }, [history, period]);

  const exerciseOptions = useMemo(() => {
    const map = new Map<string, string>();

    periodHistory.forEach((entry) => {
      entry.exercises.forEach((exercise) => {
        const key = getExerciseKey(exercise.name);
        if (!map.has(key)) {
          map.set(key, exercise.name);
        }
      });
    });

    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [periodHistory]);

  useEffect(() => {
    if (exerciseFilter === 'all') return;
    const stillExists = exerciseOptions.some((item) => item.value === exerciseFilter);
    if (!stillExists) {
      setExerciseFilter('all');
    }
  }, [exerciseFilter, exerciseOptions]);

  const scopedHistory = useMemo(() => {
    return periodHistory.filter((entry) => matchesExercise(entry, exerciseFilter));
  }, [periodHistory, exerciseFilter]);

  const sortedScopedHistory = useMemo(() => {
    return [...scopedHistory].sort(sortByDateAsc);
  }, [scopedHistory]);

  const totalSeances = scopedHistory.length;

  const totalDurationMinutes = useMemo(() => {
    return scopedHistory.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  }, [scopedHistory]);

  const totalVolumeKg = useMemo(() => {
    return scopedHistory.reduce((sum, entry) => sum + seanceVolume(entry, exerciseFilter), 0);
  }, [scopedHistory, exerciseFilter]);

  const totalSeries = useMemo(() => {
    return scopedHistory.reduce((sum, entry) => sum + seanceSeriesCount(entry), 0);
  }, [scopedHistory]);

  const personalRecords = useMemo(() => {
    return computeRecords(periodHistory, exerciseFilter);
  }, [periodHistory, exerciseFilter]);

  const weeklyVolumes = useMemo(() => {
    return computeWeeklyVolumes(periodHistory, exerciseFilter);
  }, [periodHistory, exerciseFilter]);

  const avgDurationMinutes = totalSeances > 0 ? Math.round(totalDurationMinutes / totalSeances) : 0;
  const avgVolumePerSeance = totalSeances > 0 ? Math.round(totalVolumeKg / totalSeances) : 0;

  const seanceProgression = useMemo(() => {
    const capped = sortedScopedHistory.slice(-SEANCE_PROGRESS_MAX);
    const lastKey = capped.length > 0 ? capped[capped.length - 1].id : null;

    return capped.map((seance) => ({
      key: seance.id,
      label: formatShortDate(seance.endedAt),
      value: Math.round(seanceVolume(seance, exerciseFilter)),
      emphasized: seance.id === lastKey,
    }));
  }, [sortedScopedHistory, exerciseFilter]);

  const maxSeanceVolume = seanceProgression.reduce((max, item) => Math.max(max, item.value), 0);

  const volumeTrendPercent = useMemo(() => {
    const list = sortedScopedHistory;
    if (list.length < 4) {
      return null;
    }

    const half = Math.floor(list.length / 2);
    const firstHalf = list.slice(0, half);
    const secondHalf = list.slice(-half);
    const avgVolume = (seances: CompletedSeance[]) =>
      seances.reduce((sum, seance) => sum + seanceVolume(seance, exerciseFilter), 0) /
      seances.length;

    const firstAvg = avgVolume(firstHalf);
    const secondAvg = avgVolume(secondHalf);
    if (firstAvg <= 0) {
      return null;
    }

    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  }, [sortedScopedHistory, exerciseFilter]);

  const exerciseTrends = useMemo(() => {
    const map = new Map<string, ExerciseTrend>();

    [...periodHistory].sort(sortByDateAsc).forEach((seance) => {
      seance.exercises.forEach((exercise) => {
        const key = getExerciseKey(exercise.name);
        if (exerciseFilter !== 'all' && key !== exerciseFilter) {
          return;
        }

        let entry = map.get(key);
        if (!entry) {
          entry = {
            key,
            name: exercise.name,
            seances: 0,
            volumeKg: 0,
            bestWeightKg: 0,
            bestReps: 0,
            points: [],
          };
          map.set(key, entry);
        }

        entry.seances += 1;
        entry.volumeKg += exercise.sets.reduce(
          (sum, setItem) => sum + setItem.weightKg * setItem.reps,
          0
        );

        let seanceBestWeight = 0;
        let seanceBestReps = 0;
        exercise.sets.forEach((setItem) => {
          if (
            setItem.weightKg > seanceBestWeight ||
            (setItem.weightKg === seanceBestWeight && setItem.reps > seanceBestReps)
          ) {
            seanceBestWeight = setItem.weightKg;
            seanceBestReps = setItem.reps;
          }
        });

        if (
          seanceBestWeight > entry.bestWeightKg ||
          (seanceBestWeight === entry.bestWeightKg && seanceBestReps > entry.bestReps)
        ) {
          entry.bestWeightKg = seanceBestWeight;
          entry.bestReps = seanceBestReps;
        }

        entry.points.push({
          key: seance.id,
          label: formatShortDate(seance.endedAt),
          value: seanceBestWeight,
        });
      });
    });

    return [...map.values()].sort((a, b) => b.volumeKg - a.volumeKg);
  }, [periodHistory, exerciseFilter]);

  const exerciseTrendCards = exerciseTrends.slice(0, EXERCISE_TREND_MAX);
  const volumeByExercise = exerciseTrends.slice(0, VOLUME_BY_EXERCISE_MAX);
  const maxExerciseVolume = volumeByExercise.reduce((max, item) => Math.max(max, item.volumeKg), 0);
  const exerciseTrendsTotalVolume = exerciseTrends.reduce((sum, item) => sum + item.volumeKg, 0);

  const monthlyFrequency = useMemo(() => {
    if (sortedScopedHistory.length === 0) {
      return [];
    }

    const anchor = new Date(sortedScopedHistory[sortedScopedHistory.length - 1].endedAt);
    const keys: string[] = [];
    let year = anchor.getFullYear();
    let month = anchor.getMonth();

    for (let index = 0; index < FREQUENCY_MONTHS; index += 1) {
      keys.unshift(`${year}-${pad2(month + 1)}`);
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    }

    const counts = new Map<string, number>();
    const durations = new Map<string, number>();

    sortedScopedHistory.forEach((seance) => {
      const date = new Date(seance.endedAt);
      const key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
      if (!keys.includes(key)) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
      durations.set(key, (durations.get(key) ?? 0) + seance.durationMinutes);
    });

    const spansYears = new Set(keys.map((key) => key.slice(0, 4))).size > 1;

    return keys.map((key, index) => {
      const count = counts.get(key) ?? 0;
      const totalDuration = durations.get(key) ?? 0;
      const monthIndex = Number(key.slice(5, 7)) - 1;
      const previousKey = index > 0 ? keys[index - 1] : null;
      const sameYearAsPrevious = previousKey ? previousKey.slice(0, 4) === key.slice(0, 4) : true;

      return {
        key,
        label:
          spansYears && (index === 0 || !sameYearAsPrevious)
            ? `${MONTH_SHORT_LABELS[monthIndex]} ${key.slice(2, 4)}`
            : MONTH_SHORT_LABELS[monthIndex],
        count,
        avgDuration: count > 0 ? Math.round(totalDuration / count) : 0,
      };
    });
  }, [sortedScopedHistory]);

  const maxMonthlyCount = monthlyFrequency.reduce((max, item) => Math.max(max, item.count), 0);
  const maxMonthlyDuration = monthlyFrequency.reduce(
    (max, item) => Math.max(max, item.avgDuration),
    0
  );

  const weekdayFrequency = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    sortedScopedHistory.forEach((seance) => {
      const date = new Date(seance.endedAt);
      counts[(date.getDay() + 6) % 7] += 1;
    });

    const maxCount = Math.max(...counts);

    return WEEKDAY_LABELS.map((label, index) => ({
      key: `weekday-${index}`,
      label,
      value: counts[index],
      emphasized: counts[index] > 0 && counts[index] === maxCount,
    }));
  }, [sortedScopedHistory]);

  const intensityCounts = useMemo(() => {
    const now = new Date();
    const counts: Record<SetIntensity, number> = { faible: 0, modere: 0, intense: 0 };

    setLogs.forEach((setItem) => {
      if (exerciseFilter !== 'all' && getExerciseKey(setItem.exerciseName) !== exerciseFilter) {
        return;
      }
      if (!inPeriod(setItem.date, period, now)) {
        return;
      }
      counts[setItem.intensity ?? 'faible'] += 1;
    });

    return counts;
  }, [setLogs, period, exerciseFilter]);

  const intensityTotal =
    intensityCounts.faible + intensityCounts.modere + intensityCounts.intense;

  const weeklyMaxVolume = weeklyVolumes.reduce((max, item) => Math.max(max, item.volumeKg), 0);
  const hasData = scopedHistory.length > 0;
  const intensityColors: Record<SetIntensity, string> = {
    faible: colors.success,
    modere: colors.warning,
    intense: colors.danger,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Statistiques" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Filtres */}
        <View style={[styles.segmented, { backgroundColor: colors.cardMuted }]}>
          {PERIOD_OPTIONS.map((option) => {
            const active = period === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPeriod(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.segment, active && [styles.segmentActive, { backgroundColor: colors.card }]]}
              >
                <Text style={[typography.captionStrong, { color: active ? colors.text : colors.subtleText }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {exerciseOptions.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroller}
          >
            <Chip label="Tous les exercices" active={exerciseFilter === 'all'} onPress={() => setExerciseFilter('all')} />
            {exerciseOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={option.value === exerciseFilter}
                onPress={() => setExerciseFilter(option.value)}
              />
            ))}
          </ScrollView>
        ) : null}

        {!hasData ? (
          <EmptyState
            icon="stats-chart-outline"
            title="Pas encore de statistiques"
            message={
              period === 'all'
                ? 'Enregistrez des séries dans vos exercices : vos graphiques apparaîtront ici.'
                : 'Aucune séance sur cette période. Essayez « Tout ».'
            }
          />
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <Kpi label="Séances" value={String(totalSeances)} />
              <Kpi label="Volume total" value={formatKg(totalVolumeKg)} />
              <Kpi label="Séries" value={formatInteger(totalSeries)} />
            </View>
            <View style={styles.kpiGrid}>
              <Kpi label="Temps total" value={formatDuration(totalDurationMinutes)} />
              <Kpi label="Durée moyenne" value={formatDuration(avgDurationMinutes)} />
              <Kpi label="Volume / séance" value={formatKg(avgVolumePerSeance)} />
            </View>

            <SectionCard
              title="Progression par séance"
              caption={`Volume soulevé · ${SEANCE_PROGRESS_MAX} dernières séances`}
            >
              {volumeTrendPercent !== null ? (
                <View style={[styles.trendBadge, { backgroundColor: colors.cardMuted }]}>
                  <Ionicons
                    name={volumeTrendPercent >= 0 ? 'trending-up' : 'trending-down'}
                    size={18}
                    color={volumeTrendPercent >= 0 ? colors.success : colors.danger}
                  />
                  <Text style={[typography.captionStrong, styles.flex, { color: colors.text }]}>
                    <Text style={{ color: volumeTrendPercent >= 0 ? colors.success : colors.danger }}>
                      {volumeTrendPercent >= 0 ? '+' : ''}
                      {volumeTrendPercent} %
                    </Text>{' '}
                    de volume moyen par rapport au début de la période
                  </Text>
                </View>
              ) : null}
              <BarChart
                data={seanceProgression}
                maxValue={maxSeanceVolume}
                minSlots={SEANCE_PROGRESS_MAX}
                showValues
                formatValue={(value) => (value >= 1000 ? `${formatWeight(Math.round(value / 100) / 10)}k` : String(value))}
              />
            </SectionCard>

            {personalRecords.length > 0 ? (
              <SectionCard title="Records personnels" caption="Meilleure série par exercice">
                {personalRecords.slice(0, 8).map((record, index) => (
                  <View
                    key={record.exerciseKey}
                    style={[
                      styles.recordRow,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.rank,
                        { backgroundColor: index === 0 ? colors.warning : colors.cardMuted },
                      ]}
                    >
                      {index === 0 ? (
                        <Ionicons name="trophy" size={14} color={colors.onPrimary} />
                      ) : (
                        <Text style={[typography.captionStrong, { color: colors.subtleText }]}>{index + 1}</Text>
                      )}
                    </View>
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.text }]}>
                        {record.exerciseName}
                      </Text>
                      <Text style={[typography.caption, styles.capitalize, { color: colors.subtleText }]}>
                        {formatRelativeDay(record.at)}
                      </Text>
                    </View>
                    <Text style={[typography.number, { color: colors.text }]}>
                      {formatWeight(record.weightKg)} kg × {record.reps}
                    </Text>
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {exerciseTrendCards.length > 0 ? (
              <SectionCard title="Progression par exercice" caption="Charge maximale à chaque séance">
                {exerciseTrendCards.map((exercise, index) => {
                  const visiblePoints = exercise.points.slice(-EXERCISE_POINTS_MAX);
                  const maxPoint = visiblePoints.reduce((max, point) => Math.max(max, point.value), 0);

                  return (
                    <View
                      key={exercise.key}
                      style={[
                        styles.exerciseBlock,
                        index > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.border,
                          paddingTop: spacing.md,
                        },
                      ]}
                    >
                      <View style={styles.exerciseHeaderRow}>
                        <Text numberOfLines={1} style={[typography.bodyStrong, styles.flex, { color: colors.text }]}>
                          {exercise.name}
                        </Text>
                        <Text style={[typography.number, { color: colors.primary }]}>
                          {formatWeight(exercise.bestWeightKg)} kg × {exercise.bestReps}
                        </Text>
                      </View>
                      <Text style={[typography.caption, { color: colors.subtleText }]}>
                        {pluralize(exercise.seances, 'séance')} · {formatKg(exercise.volumeKg)} soulevés
                      </Text>
                      {maxPoint <= 0 ? (
                        <Text style={[typography.caption, styles.italic, { color: colors.subtleText }]}>
                          Poids du corps, sans lest enregistré
                        </Text>
                      ) : (
                        <BarChart
                          data={visiblePoints}
                          maxValue={maxPoint}
                          height={48}
                          minSlots={EXERCISE_POINTS_MAX}
                          showValues
                          showLabels={false}
                          formatValue={formatWeight}
                        />
                      )}
                    </View>
                  );
                })}
              </SectionCard>
            ) : null}

            {volumeByExercise.length > 1 ? (
              <SectionCard title="Volume par exercice" caption="Part du volume total de la période">
                <HorizontalBarList
                  data={volumeByExercise.map((exercise) => ({
                    key: exercise.key,
                    label: exercise.name,
                    value: exercise.volumeKg,
                    detail:
                      exerciseTrendsTotalVolume > 0
                        ? `${Math.round((exercise.volumeKg / exerciseTrendsTotalVolume) * 100)} %`
                        : undefined,
                  }))}
                  maxValue={maxExerciseVolume}
                  formatValue={formatKg}
                />
              </SectionCard>
            ) : null}

            <SectionCard title="Régularité" caption="Séances par mois, puis par jour de la semaine">
              <BarChart
                data={monthlyFrequency.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value: item.count,
                  emphasized: item.count > 0 && item.count === maxMonthlyCount,
                }))}
                maxValue={maxMonthlyCount}
                height={80}
                minSlots={FREQUENCY_MONTHS}
                showValues
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <BarChart
                data={weekdayFrequency}
                maxValue={weekdayFrequency.reduce((max, item) => Math.max(max, item.value), 0)}
                height={64}
                minSlots={7}
                showValues
              />
            </SectionCard>

            {maxMonthlyDuration > 0 ? (
              <SectionCard title="Durée moyenne d'une séance" caption="En minutes, par mois">
                <BarChart
                  data={monthlyFrequency.map((item) => ({ key: item.key, label: item.label, value: item.avgDuration }))}
                  maxValue={maxMonthlyDuration}
                  height={80}
                  minSlots={FREQUENCY_MONTHS}
                  showValues
                />
              </SectionCard>
            ) : null}

            {intensityTotal > 0 ? (
              <SectionCard title="Intensité des séries" caption="Ressenti noté sur chaque série">
                <View style={[styles.stackedBar, { backgroundColor: colors.cardMuted }]}>
                  {INTENSITY_META.map((meta) =>
                    intensityCounts[meta.key] > 0 ? (
                      <View
                        key={meta.key}
                        style={{ flex: intensityCounts[meta.key], backgroundColor: intensityColors[meta.key] }}
                      />
                    ) : null
                  )}
                </View>
                <View style={styles.intensityLegend}>
                  {INTENSITY_META.map((meta) => (
                    <View key={meta.key} style={styles.intensityItem}>
                      <View style={[styles.legendDot, { backgroundColor: intensityColors[meta.key] }]} />
                      <Text style={[typography.caption, { color: colors.subtleText }]}>{meta.label}</Text>
                      <Text style={[typography.captionStrong, styles.tabular, { color: colors.text }]}>
                        {Math.round((intensityCounts[meta.key] / intensityTotal) * 100)} %
                      </Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            ) : null}

            {weeklyVolumes.length > 1 ? (
              <SectionCard title="Évolution hebdomadaire" caption="Volume soulevé par semaine">
                <BarChart
                  data={weeklyVolumes.map((item) => ({
                    key: item.weekKey,
                    label: item.label,
                    value: Math.round(item.volumeKg),
                  }))}
                  maxValue={weeklyMaxVolume}
                  minSlots={8}
                  showValues
                  formatValue={(value) => (value >= 1000 ? `${formatWeight(Math.round(value / 100) / 10)}k` : String(value))}
                />
              </SectionCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  italic: { fontStyle: 'italic' },
  capitalize: { textTransform: 'capitalize' },
  scrollContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl, gap: spacing.md },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 36, borderRadius: radius.sm },
  segmentActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chipScroller: { marginHorizontal: -SCREEN_PADDING },
  chipRow: { gap: spacing.sm, paddingHorizontal: SCREEN_PADDING },
  chip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  sectionHeader: { gap: 2 },
  kpiGrid: { flexDirection: 'row', gap: spacing.sm },
  kpiCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  kpiValue: { fontSize: 18 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barColumn: { alignItems: 'center', paddingHorizontal: 3 },
  barArea: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '100%', maxWidth: 28, borderRadius: 4 },
  barValue: { fontSize: 10, fontWeight: '600', marginBottom: 4, fontVariant: ['tabular-nums'] },
  barLabel: { fontSize: 10, marginTop: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  hbarList: { gap: spacing.md },
  hbarItem: { gap: spacing.xs + 2 },
  hbarLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hbarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 4 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs + 2 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exerciseBlock: { gap: spacing.xs + 2 },
  exerciseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stackedBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
  intensityLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  intensityItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
