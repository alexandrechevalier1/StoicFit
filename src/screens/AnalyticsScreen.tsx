import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompletedSeance } from '../models';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';

type Props = NativeStackScreenProps<SeancesStackParamList, 'Analytics'>;

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

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette annee' },
];

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

function computeRecords(history: CompletedSeance[], exerciseFilter: string) {
  const bestByExercise = new Map<string, PersonalRecord>();

  history
    .slice()
    .sort((a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime())
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

export default function AnalyticsScreen({ navigation }: Props) {
  const history = useProgramStore((state) => state.history);
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

  const totalSeances = scopedHistory.length;

  const totalDurationMinutes = useMemo(() => {
    return scopedHistory.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  }, [scopedHistory]);

  const totalVolumeKg = useMemo(() => {
    return scopedHistory.reduce((sum, entry) => sum + seanceVolume(entry, exerciseFilter), 0);
  }, [scopedHistory, exerciseFilter]);

  const personalRecords = useMemo(() => {
    return computeRecords(periodHistory, exerciseFilter);
  }, [periodHistory, exerciseFilter]);

  const weeklyVolumes = useMemo(() => {
    return computeWeeklyVolumes(periodHistory, exerciseFilter);
  }, [periodHistory, exerciseFilter]);

  const maxWeeklyVolume = weeklyVolumes.reduce((max, item) => Math.max(max, item.volumeKg), 0);

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
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Filtres</Text>
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
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{option.label}</Text>
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
              <Text style={[styles.chipText, { color: exerciseFilter === 'all' ? '#fff' : colors.text }]}>Tous les exercices</Text>
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
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Volume total</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{Math.round(totalVolumeKg)} kg</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Seances</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{totalSeances}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Temps total</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{totalDurationMinutes} min</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Records personnels</Text>
          {personalRecords.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>Aucun record disponible pour ce filtre.</Text>
          ) : (
            personalRecords.slice(0, 6).map((record) => (
              <View key={record.exerciseKey} style={[styles.recordRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.recordExercise, { color: colors.text }]}>{record.exerciseName}</Text>
                  <Text style={[styles.recordDate, { color: colors.subtleText }]}>
                    {new Date(record.at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.recordValue, { color: colors.primary }]}>
                  {record.weightKg} kg x {record.reps}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Evolution hebdomadaire</Text>
          {weeklyVolumes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtleText }]}>Aucune evolution a afficher.</Text>
          ) : (
            <View style={styles.chartRow}>
              {weeklyVolumes.map((item) => {
                const ratio = maxWeeklyVolume > 0 ? item.volumeKg / maxWeeklyVolume : 0;
                const barHeight = Math.max(12, Math.round(ratio * 120));

                return (
                  <View key={item.weekKey} style={styles.barColumn}>
                    <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: colors.primary,
                            height: barHeight,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: colors.text }]}>{Math.round(item.volumeKg)}</Text>
                    <Text style={[styles.barLabel, { color: colors.subtleText }]}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
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
    minHeight: 92,
    justifyContent: 'space-between',
  },
  kpiLabel: { fontSize: 13 },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  emptyText: { fontSize: 14 },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  recordExercise: { fontSize: 15, fontWeight: '600' },
  recordDate: { fontSize: 12, marginTop: 2 },
  recordValue: { fontSize: 16, fontWeight: '800' },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 180,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    maxWidth: 28,
    height: 130,
    borderRadius: 8,
    justifyContent: 'flex-end',
    padding: 3,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barValue: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  barLabel: { fontSize: 10, marginTop: 2 },
});
