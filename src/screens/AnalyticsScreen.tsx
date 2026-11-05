import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompletedSeance, SetIntensity } from '../models';
import type { ProfilStackParamList } from '../navigation/RootNavigator';
import { useProgramStore } from '../store/programStore';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { useThemeColors } from '../theme/useThemeColors';

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

const INTENSITY_META: { key: SetIntensity; label: string; color: string }[] = [
  { key: 'faible', label: 'Faible', color: '#4CD964' },
  { key: 'modere', label: 'Modéré', color: '#FF9500' },
  { key: 'intense', label: 'Intense', color: '#FF3B30' },
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

function formatWeight(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1).replace('.', ',');
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
  height = 130,
  showValues = false,
  showLabels = true,
  valueFontSize = 10,
  labelFontSize = 10,
  maxBarWidth = 34,
  formatValue,
}: {
  data: BarDatum[];
  maxValue: number;
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  valueFontSize?: number;
  labelFontSize?: number;
  maxBarWidth?: number;
  formatValue?: (value: number) => string;
}) {
  const colors = useThemeColors();
  const hasEmphasis = data.some((item) => item.emphasized);
  // Le track a un padding de 3 de chaque côté : la barre ne peut pas dépasser le contenu.
  const innerHeight = Math.max(10, height - 6);

  return (
    <View style={styles.chartRow}>
      {data.map((item) => {
        const ratio = maxValue > 0 ? item.value / maxValue : 0;
        const barHeight = item.value > 0 ? Math.max(6, Math.round(ratio * innerHeight)) : 3;

        return (
          <View key={item.key} style={styles.barColumn}>
            {showValues ? (
              <Text
                numberOfLines={1}
                style={[styles.barValue, { color: colors.subtleText, fontSize: valueFontSize }]}
              >
                {formatValue ? formatValue(item.value) : String(item.value)}
              </Text>
            ) : null}

            <View style={[styles.barTrack, { height, maxWidth: maxBarWidth, backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: barHeight,
                    backgroundColor: item.color ?? colors.primary,
                    opacity: hasEmphasis && !item.emphasized ? 0.45 : 1,
                  },
                ]}
              />
            </View>

            {showLabels ? (
              <Text
                numberOfLines={1}
                style={[styles.barLabel, { color: colors.subtleText, fontSize: labelFontSize }]}
              >
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
              <Text numberOfLines={1} style={[styles.hbarLabel, { color: colors.text }]}>
                {item.label}
              </Text>
              <Text numberOfLines={1} style={[styles.hbarValue, { color: colors.subtleText }]}>
                {formatValue ? formatValue(item.value) : String(item.value)}
                {item.detail ? `  ·  ${item.detail}` : ''}
              </Text>
            </View>
            <View style={[styles.hbarTrack, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.hbarFill,
                  { width: hbarWidth(ratio), backgroundColor: colors.primary },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SectionCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {caption ? (
          <Text style={[styles.sectionCaption, { color: colors.subtleText }]}>{caption}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>{'‹ Retour'}</Text>
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <SectionCard title="Filtres">
          <View style={styles.chipRow}>
            {PERIOD_OPTIONS.map((option) => {
              const active = period === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPeriod(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setExerciseFilter('all')}
              style={[
                styles.chip,
                {
                  backgroundColor: exerciseFilter === 'all' ? colors.primary : colors.background,
                  borderColor: exerciseFilter === 'all' ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[styles.chipText, { color: exerciseFilter === 'all' ? '#fff' : colors.text }]}
              >
                Tous les exercices
              </Text>
            </Pressable>
            {exerciseOptions.map((option) => {
              const active = option.value === exerciseFilter;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setExerciseFilter(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Volume total</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {Math.round(totalVolumeKg)} kg
            </Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Séances</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{totalSeances}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Temps total</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {totalDurationMinutes} min
            </Text>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Durée moy.</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{avgDurationMinutes} min</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Volume / séance</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{avgVolumePerSeance} kg</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Séries totales</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{totalSeries}</Text>
          </View>
        </View>

        <SectionCard
          title="Progression par séance"
          caption={`Volume soulevé par séance (kg) · ${SEANCE_PROGRESS_MAX} dernières`}
        >
          {!hasData ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucune séance enregistrée pour ce filtre.
            </Text>
          ) : (
            <>
              {volumeTrendPercent !== null ? (
                <View
                  style={[
                    styles.trendBadge,
                    {
                      backgroundColor:
                        volumeTrendPercent >= 0 ? 'rgba(76,217,100,0.15)' : 'rgba(255,59,48,0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.trendBadgeText,
                      { color: volumeTrendPercent >= 0 ? '#4CD964' : colors.danger },
                    ]}
                  >
                    {volumeTrendPercent >= 0 ? '📈' : '📉'} {volumeTrendPercent >= 0 ? '+' : ''}
                    {volumeTrendPercent} % de volume entre les deux moitiés de la période
                  </Text>
                </View>
              ) : null}

              <BarChart
                data={seanceProgression}
                maxValue={maxSeanceVolume}
                height={110}
                showValues
                valueFontSize={9}
                formatValue={(value) => String(value)}
              />
            </>
          )}
        </SectionCard>

        <SectionCard title="Records personnels" caption="Meilleur résultat par exercice">
          {personalRecords.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucun record disponible pour ce filtre.
            </Text>
          ) : (
            <>
              {personalRecords.slice(0, 3).map((record, index) => (
                <View
                  key={record.exerciseKey}
                  style={[
                    styles.podiumRow,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.podiumMedal}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </Text>
                  <View style={styles.podiumTexts}>
                    <Text
                      numberOfLines={1}
                      style={[styles.recordExercise, { color: colors.text }]}
                    >
                      {record.exerciseName}
                    </Text>
                    <Text style={[styles.recordDate, { color: colors.subtleText }]}>
                      {new Date(record.at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.podiumValue, { color: colors.primary }]}>
                    {formatWeight(record.weightKg)} kg × {record.reps}
                  </Text>
                </View>
              ))}

              {personalRecords.slice(3, 8).map((record) => (
                <View
                  key={record.exerciseKey}
                  style={[styles.recordRow, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.recordTexts}>
                    <Text
                      numberOfLines={1}
                      style={[styles.recordExercise, { color: colors.text }]}
                    >
                      {record.exerciseName}
                    </Text>
                    <Text style={[styles.recordDate, { color: colors.subtleText }]}>
                      {new Date(record.at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.recordValue, { color: colors.primary }]}>
                    {formatWeight(record.weightKg)} kg × {record.reps}
                  </Text>
                </View>
              ))}
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Progression par exercice"
          caption="Poids le plus lourd soulevé à chaque séance (kg)"
        >
          {exerciseTrendCards.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucun exercice à analyser pour ce filtre.
            </Text>
          ) : (
            exerciseTrendCards.map((exercise, index) => {
              const visiblePoints = exercise.points.slice(-EXERCISE_POINTS_MAX);
              const maxPoint = visiblePoints.reduce((max, point) => Math.max(max, point.value), 0);

              return (
                <View
                  key={exercise.key}
                  style={[
                    styles.exerciseBlock,
                    index > 0
                      ? {
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          paddingTop: 12,
                        }
                      : null,
                  ]}
                >
                  <View style={styles.exerciseHeaderRow}>
                    <Text
                      numberOfLines={1}
                      style={[styles.exerciseName, { color: colors.text }]}
                    >
                      {exercise.name}
                    </Text>
                    <Text style={[styles.exerciseRecord, { color: colors.primary }]}>
                      {formatWeight(exercise.bestWeightKg)} kg × {exercise.bestReps}
                    </Text>
                  </View>

                  <Text style={[styles.exerciseMeta, { color: colors.subtleText }]}>
                    {exercise.seances} séance{exercise.seances > 1 ? 's' : ''} ·{' '}
                    {Math.round(exercise.volumeKg)} kg soulevés
                  </Text>

                  {maxPoint <= 0 ? (
                    <Text style={[styles.exerciseBodyweight, { color: colors.subtleText }]}>
                      Poids de corps — aucun lest enregistré
                    </Text>
                  ) : (
                    <BarChart
                      data={visiblePoints}
                      maxValue={maxPoint}
                      height={54}
                      showValues
                      showLabels={false}
                      valueFontSize={9}
                      formatValue={formatWeight}
                    />
                  )}
                </View>
              );
            })
          )}
        </SectionCard>

        <SectionCard
          title="Volume par exercice"
          caption="Part du volume total de la période"
        >
          {volumeByExercise.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucun volume à répartir pour ce filtre.
            </Text>
          ) : (
            <HorizontalBarList
              data={volumeByExercise.map((exercise) => ({
                key: exercise.key,
                label: exercise.name,
                value: exercise.volumeKg,
                detail:
                  exerciseTrendsTotalVolume > 0
                    ? `${Math.round(
                        (exercise.volumeKg / exerciseTrendsTotalVolume) * 100
                      )} %`
                    : undefined,
              }))}
              maxValue={maxExerciseVolume}
              formatValue={(value) => `${Math.round(value)} kg`}
            />
          )}
        </SectionCard>

        <SectionCard title="Fréquence d'entraînement" caption="Séances par mois">
          {!hasData ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucune séance à comptabiliser.
            </Text>
          ) : (
            <>
              <BarChart
                data={monthlyFrequency.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value: item.count,
                  emphasized:
                    item.count > 0 && item.count === maxMonthlyCount,
                }))}
                maxValue={maxMonthlyCount}
                height={90}
                showValues
                labelFontSize={9}
              />
              <Text style={[styles.subTitle, { color: colors.text }]}>Jours de la semaine</Text>
              <BarChart
                data={weekdayFrequency}
                maxValue={weekdayFrequency.reduce(
                  (max, item) => Math.max(max, item.value),
                  0
                )}
                height={70}
                showValues
                labelFontSize={9}
              />
            </>
          )}
        </SectionCard>

        <SectionCard title="Durée moyenne par séance" caption="Minutes par mois">
          {!hasData || maxMonthlyDuration <= 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucune durée enregistrée pour ce filtre.
            </Text>
          ) : (
            <BarChart
              data={monthlyFrequency.map((item) => ({
                key: item.key,
                label: item.label,
                value: item.avgDuration,
              }))}
              maxValue={maxMonthlyDuration}
              height={90}
              showValues
              labelFontSize={9}
              formatValue={(value) => `${value}'`}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Intensité des séries"
          caption="Répartition faible / modéré / intense des séries enregistrées"
        >
          {intensityTotal === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucune série enregistrée pour ce filtre.
            </Text>
          ) : (
            <BarChart
              data={INTENSITY_META.map((meta) => ({
                key: meta.key,
                label: meta.label,
                value: intensityCounts[meta.key],
                color: meta.color,
              }))}
              maxValue={Math.max(
                intensityCounts.faible,
                intensityCounts.modere,
                intensityCounts.intense
              )}
              height={90}
              showValues
              valueFontSize={11}
              labelFontSize={11}
              maxBarWidth={56}
              formatValue={(value) =>
                `${value} (${Math.round((value / intensityTotal) * 100)} %)`
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title="Évolution hebdomadaire"
          caption="Volume soulevé par semaine (kg)"
        >
          {weeklyVolumes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>
              Aucune évolution à afficher.
            </Text>
          ) : (
            <BarChart
              data={weeklyVolumes.map((item) => ({
                key: item.weekKey,
                label: item.label,
                value: Math.round(item.volumeKg),
              }))}
              maxValue={weeklyMaxVolume}
              height={110}
              showValues
              valueFontSize={9}
              labelFontSize={9}
            />
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: { fontSize: 16, fontWeight: '600' },
  screenTitle: { fontSize: 20, fontWeight: '700' },
  headerSpacer: { width: 64 },
  scrollContent: { paddingBottom: 24, gap: 14 },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionCaption: { fontSize: 12, marginTop: 2 },
  subTitle: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 84,
    justifyContent: 'space-between',
  },
  kpiLabel: { fontSize: 12 },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  emptyText: { fontSize: 14 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 60,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    borderRadius: 8,
    justifyContent: 'flex-end',
    padding: 3,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barValue: { fontSize: 10, marginTop: 6, fontWeight: '700' },
  barLabel: { fontSize: 10, marginTop: 4 },
  hbarList: { gap: 12 },
  hbarItem: { gap: 5 },
  hbarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  hbarLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  hbarValue: { fontSize: 12, fontWeight: '600' },
  hbarTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  hbarFill: {
    height: '100%',
    borderRadius: 6,
  },
  trendBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trendBadgeText: { fontSize: 13, fontWeight: '700' },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  podiumMedal: { fontSize: 22 },
  podiumTexts: { flex: 1 },
  podiumValue: { fontSize: 15, fontWeight: '800' },
  recordTexts: { flex: 1 },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  recordExercise: { fontSize: 15, fontWeight: '600' },
  recordDate: { fontSize: 12, marginTop: 2 },
  recordValue: { fontSize: 16, fontWeight: '800' },
  exerciseBlock: { gap: 6 },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  exerciseName: { fontSize: 15, fontWeight: '700', flex: 1 },
  exerciseRecord: { fontSize: 14, fontWeight: '800' },
  exerciseMeta: { fontSize: 12 },
  exerciseBodyweight: { fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
});
