import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Image, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProgramStore } from '../store/programStore';
import { useNutritionStorage } from '../hooks/useNutritionStorage';
import { useProfileStore } from '../store/profileStore';
import { useThemeStore } from '../store/themeStore';
import { useThemeColors } from '../theme/useThemeColors';
import ProfileOnboardingSheet from '../components/ProfileOnboardingSheet';
import { getLocalDateKey } from '../utils/nutritionDate';
import type { CompletedSeance } from '../models';

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

export default function ProfileScreen() {
  const programs = useProgramStore((state) => state.programs);
  const history = useProgramStore((state) => state.history);
  const { goals, logsByDate, getWeeklySummary } = useNutritionStorage();
  const profile = useProfileStore((state) => state.profile);
  const displayName = useProfileStore((state) => state.displayName);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const setDisplayName = useProfileStore((state) => state.setDisplayName);
  const setAvatarUri = useProfileStore((state) => state.setAvatarUri);
  const setProfile = useProfileStore((state) => state.setProfile);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const colors = useThemeColors();
  const [isHealthFormVisible, setIsHealthFormVisible] = useState(false);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "L'accès à la galerie photo est nécessaire pour choisir une image."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const isWithinLastDays = (dateIso: string, days: number): boolean => {
    const diff = Date.now() - new Date(dateIso).getTime();
    return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
  };

  const weeklyWorkoutStats = useMemo(() => {
    const setsThisWeek = programs.flatMap((p) =>
      p.seances.flatMap((s) =>
        s.exercises.flatMap((e) => e.sets.filter((set) => isWithinLastDays(set.date, 7)))
      )
    );
    const workoutDays = new Set(setsThisWeek.map((set) => set.date.slice(0, 10)));
    const totalVolume = setsThisWeek.reduce((sum, set) => sum + set.reps * set.weightKg, 0);
    return {
      sessionsCount: workoutDays.size,
      setsCount: setsThisWeek.length,
      totalVolume: Math.round(totalVolume),
    };
  }, [programs]);

  const weeklyNutritionStats = useMemo(() => {
    const summary = getWeeklySummary(getLocalDateKey());
    const daysLogged = summary.days.filter((day) => day.totals.itemsCount > 0).length;

    return {
      avgCalories: summary.averages.calories,
      avgWaterMl: summary.averages.waterMl,
      daysLogged,
    };
  }, [getWeeklySummary, goals, logsByDate]);

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
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>Profil</Text>
        <Pressable onPress={toggleDarkMode} hitSlop={12} style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>{isDarkMode ? '🌙' : '☀️'}</Text>
        </Pressable>
      </View>

      <View style={styles.headerRow}>
        <Pressable
          onPress={handlePickAvatar}
          style={[styles.avatar, { backgroundColor: colors.card }]}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholder}>📷</Text>
          )}
        </Pressable>
        <TextInput
          style={[styles.nameInput, { color: colors.text }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Votre pseudo"
          placeholderTextColor={colors.subtleText}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Rapport hebdomadaire</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardSubtitle, { color: colors.subtleText }]}>Musculation</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyWorkoutStats.sessionsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>jours entraînés</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyWorkoutStats.setsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>séries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyWorkoutStats.totalVolume}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>kg soulevés</Text>
          </View>
        </View>

        <Text
          style={[styles.cardSubtitle, styles.cardSubtitleSpaced, { color: colors.subtleText }]}
        >
          Nutrition
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyNutritionStats.avgCalories}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>
              kcal/j (obj. {goals.calories})
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {(weeklyNutritionStats.avgWaterMl / 1000).toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>L d'eau/j</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyNutritionStats.daysLogged}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>jours suivis</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Analytics</Text>
      <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Volume total</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{Math.round(totalVolumeKg)} kg</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Seances</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{totalSeances}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.kpiLabel, { color: colors.subtleText }]}>Temps total</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{totalDurationMinutes} min</Text>
          </View>
        </View>

        <Text style={[styles.cardSubtitle, styles.cardSubtitleSpaced, { color: colors.subtleText }]}>Records personnels</Text>
        {personalRecords.length === 0 ? (
          <Text style={[styles.empty, { color: colors.subtleText }]}>Aucun record disponible pour ce filtre.</Text>
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

        <Text style={[styles.cardSubtitle, styles.cardSubtitleSpaced, { color: colors.subtleText }]}>Evolution hebdomadaire</Text>
        {weeklyVolumes.length === 0 ? (
          <Text style={[styles.empty, { color: colors.subtleText }]}>Aucune evolution a afficher.</Text>
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

      <Pressable
        style={[styles.healthButton, { borderColor: colors.primary }]}
        onPress={() => setIsHealthFormVisible(true)}
      >
        <Text style={[styles.healthButtonText, { color: colors.primary }]}>
          Modifier mes informations de santé
        </Text>
      </Pressable>
      </ScrollView>

      <ProfileOnboardingSheet
        visible={isHealthFormVisible}
        initialProfile={profile ?? undefined}
        onRequestClose={() => setIsHealthFormVisible(false)}
        onComplete={(newProfile) => {
          setProfile(newProfile);
          setIsHealthFormVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: { fontSize: 20 },
  empty: { color: '#888' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { fontSize: 28 },
  nameInput: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  card: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardSubtitle: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8 },
  cardSubtitleSpaced: { marginTop: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  scrollContent: { paddingBottom: 24 },
  analyticsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
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
    minHeight: 80,
    justifyContent: 'space-between',
  },
  kpiLabel: { fontSize: 12 },
  kpiValue: { fontSize: 18, fontWeight: '800' },
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
  healthButton: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  healthButtonText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
});

