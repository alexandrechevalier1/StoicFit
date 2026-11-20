import { useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { useNutritionStorage } from '../hooks/useNutritionStorage';
import { useProfileStore } from '../store/profileStore';
import { useThemeStore } from '../store/themeStore';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, SCREEN_PADDING, spacing, typography } from '../theme/tokens';
import ProfileOnboardingSheet from '../components/ProfileOnboardingSheet';
import { getLocalDateKey } from '../utils/nutritionDate';
import { formatInteger, formatRelativeDay, formatWeight } from '../utils/format';
import { pickSquareImage } from '../utils/pickImage';
import type { ProfilStackParamList } from '../navigation/RootNavigator';
import type { CompletedSeance } from '../models';
import { ScreenHeader, type IconName } from '../components/ui';

type PersonalRecord = {
  exerciseKey: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  at: string;
};

const TOP_RECORDS_COUNT = 3;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Meilleure série (charge puis reps) de chaque exercice, de la plus lourde à la plus légère. */
function computeRecords(history: CompletedSeance[]): PersonalRecord[] {
  const bestByExercise = new Map<string, PersonalRecord>();

  history.forEach((seance) => {
    seance.exercises.forEach((exercise) => {
      const key = exercise.name.trim().toLocaleLowerCase();
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

  return [...bestByExercise.values()].sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps);
}

type Props = NativeStackScreenProps<ProfilStackParamList, 'ProfileHome'>;

export default function ProfileScreen({ navigation }: Props) {
  const setLogs = useProgramStore((state) => state.setLogs);
  const history = useWorkoutHistory();
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
    const uri = await pickSquareImage();
    if (uri) setAvatarUri(uri);
  };

  // 7 derniers jours glissants
  const workoutWeek = useMemo(() => {
    const now = Date.now();
    const recentSets = setLogs.filter((set) => {
      const diff = now - new Date(set.date).getTime();
      return diff >= 0 && diff <= WEEK_MS;
    });
    return {
      trainingDays: new Set(recentSets.map((set) => getLocalDateKey(new Date(set.date)))).size,
      setsCount: recentSets.length,
      volumeKg: recentSets.reduce((sum, set) => sum + set.reps * set.weightKg, 0),
    };
  }, [setLogs]);

  const nutritionWeek = useMemo(() => {
    const summary = getWeeklySummary(getLocalDateKey());
    return {
      avgCalories: summary.averages.calories,
      avgWaterMl: summary.averages.waterMl,
      daysLogged: summary.days.filter((day) => day.totals.itemsCount > 0).length,
    };
    // logsByDate / goals : getWeeklySummary lit ces données sans changer d'identité.
  }, [getWeeklySummary, goals, logsByDate]);

  const topRecords = useMemo(() => computeRecords(history).slice(0, TOP_RECORDS_COUNT), [history]);

  const profileSummary = profile
    ? `${profile.age} ans · ${formatWeight(profile.weightKg)} kg · ${profile.heightCm} cm`
    : 'Complétez vos informations pour calculer vos objectifs';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Profil" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identité */}
        <View style={[styles.card, styles.identity, { backgroundColor: colors.card }]}>
          <Pressable
            onPress={handlePickAvatar}
            accessibilityRole="button"
            accessibilityLabel="Changer la photo de profil"
            style={[styles.avatar, { backgroundColor: colors.primarySoft }]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={34} color={colors.primary} />
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Ionicons name="camera" size={12} color={colors.onPrimary} />
            </View>
          </Pressable>
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <TextInput
                style={[typography.title, styles.nameInput, { color: colors.text }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Votre pseudo"
                placeholderTextColor={colors.subtleText}
                accessibilityLabel="Pseudo"
              />
              <Ionicons name="pencil" size={14} color={colors.subtleText} />
            </View>
            <Text style={[typography.caption, { color: colors.subtleText }]}>{profileSummary}</Text>
          </View>
        </View>

        {/* Semaine */}
        <SectionTitle title="7 derniers jours" />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {workoutWeek.setsCount > 0 ? (
            <View style={styles.statsRow}>
              <Stat icon="barbell-outline" value={String(workoutWeek.trainingDays)} label={workoutWeek.trainingDays > 1 ? 'jours entraînés' : 'jour entraîné'} />
              <Stat icon="layers-outline" value={String(workoutWeek.setsCount)} label={workoutWeek.setsCount > 1 ? 'séries' : 'série'} />
              <Stat icon="trending-up-outline" value={`${formatInteger(workoutWeek.volumeKg)} kg`} label="volume" />
            </View>
          ) : (
            <View style={styles.inlineRow}>
              <Ionicons name="barbell-outline" size={18} color={colors.subtleText} />
              <Text style={[typography.caption, { color: colors.subtleText }]}>
                Aucune série enregistrée ces 7 derniers jours.
              </Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {nutritionWeek.daysLogged > 0 ? (
            <View style={styles.statsRow}>
              <Stat
                icon="flame-outline"
                value={formatInteger(nutritionWeek.avgCalories)}
                label={`kcal / jour (obj. ${formatInteger(goals.calories)})`}
              />
              <Stat
                icon="water-outline"
                value={`${formatWeight(Math.round(nutritionWeek.avgWaterMl / 100) / 10)} L`}
                label="d'eau / jour"
              />
              <Stat icon="calendar-outline" value={`${nutritionWeek.daysLogged} / 7`} label="jours suivis" />
            </View>
          ) : (
            <View style={styles.inlineRow}>
              <Ionicons name="nutrition-outline" size={18} color={colors.subtleText} />
              <Text style={[typography.caption, { color: colors.subtleText }]}>
                Aucun repas enregistré ces 7 derniers jours.
              </Text>
            </View>
          )}
        </View>

        {/* Records */}
        {topRecords.length > 0 ? (
          <>
            <SectionTitle title="Meilleurs records" />
            <View style={[styles.card, styles.listCard, { backgroundColor: colors.card }]}>
              {topRecords.map((record, index) => (
                <View
                  key={record.exerciseKey}
                  style={[
                    styles.listRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="trophy-outline" size={18} color={colors.warning} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                      {record.exerciseName}
                    </Text>
                    <Text style={[typography.caption, styles.capitalizeFirst, { color: colors.subtleText }]}>
                      {formatRelativeDay(record.at)}
                    </Text>
                  </View>
                  <Text style={[typography.number, { color: colors.text }]}>
                    {formatWeight(record.weightKg)} kg × {record.reps}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Réglages */}
        <SectionTitle title="Réglages" />
        <View style={[styles.card, styles.listCard, { backgroundColor: colors.card }]}>
          <SettingsRow icon="stats-chart-outline" label="Statistiques détaillées" onPress={() => navigation.navigate('Analytics')} />
          <SettingsRow
            icon="heart-outline"
            label="Informations de santé"
            detail={profile ? undefined : 'À compléter'}
            onPress={() => setIsHealthFormVisible(true)}
            bordered
          />
          <SettingsRow
            icon="moon-outline"
            label="Thème sombre"
            onPress={toggleDarkMode}
            bordered
            trailing={
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: colors.cardMuted, true: colors.primary }}
                thumbColor={colors.card}
              />
            }
          />
        </View>
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

function SectionTitle({ title }: { title: string }) {
  const colors = useThemeColors();
  return (
    <Text style={[typography.captionStrong, styles.sectionTitle, { color: colors.subtleText }]}>{title}</Text>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[typography.number, styles.statValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[typography.caption, styles.statLabel, { color: colors.subtleText }]}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  trailing,
  bordered,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onPress: () => void;
  trailing?: ReactNode;
  bordered?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.listRow,
        bordered && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[typography.body, styles.flex, { color: colors.text }]}>{label}</Text>
      {detail ? <Text style={[typography.caption, { color: colors.warning }]}>{detail}</Text> : null}
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.subtleText} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { borderRadius: radius.lg, padding: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36 },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nameInput: { flexShrink: 1, paddingVertical: 0 },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.sm, marginLeft: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 18, marginTop: spacing.xs },
  statLabel: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listCard: { paddingVertical: spacing.xs },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm },
  rowIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  capitalizeFirst: { textTransform: 'capitalize' },
});
