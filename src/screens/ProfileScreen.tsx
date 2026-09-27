import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Image, Pressable, TextInput, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProgramStore } from '../store/programStore';
import { useNutritionStorage } from '../hooks/useNutritionStorage';
import { useProfileStore } from '../store/profileStore';
import { useThemeStore } from '../store/themeStore';
import { useThemeColors } from '../theme/useThemeColors';
import ProfileOnboardingSheet from '../components/ProfileOnboardingSheet';
import { getLocalDateKey } from '../utils/nutritionDate';

export default function ProfileScreen() {
  const programs = useProgramStore((state) => state.programs);
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

  const personalRecords = useMemo(() => {
    const bestByExercise = new Map<
      string,
      { name: string; weightKg: number; reps: number; date: string }
    >();

    programs.forEach((p) =>
      p.seances.forEach((s) =>
        s.exercises.forEach((e) => {
          e.sets.forEach((set) => {
            const current = bestByExercise.get(e.name);
            if (!current || set.weightKg > current.weightKg) {
              bestByExercise.set(e.name, {
                name: e.name,
                weightKg: set.weightKg,
                reps: set.reps,
                date: set.date,
              });
            }
          });
        })
      )
    );

    return Array.from(bestByExercise.values()).sort((a, b) => b.weightKg - a.weightKg);
  }, [programs]);

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

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Records personnels</Text>
      {personalRecords.length === 0 ? (
        <Text style={[styles.empty, { color: colors.subtleText }]}>Aucun record pour le moment.</Text>
      ) : (
        <FlatList
          style={styles.recordsList}
          data={personalRecords}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <View style={[styles.recordRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.recordName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.recordValue, { color: colors.text }]}>
                {item.weightKg} kg × {item.reps}
              </Text>
            </View>
          )}
        />
      )}

      <Pressable
        style={[styles.healthButton, { borderColor: colors.primary }]}
        onPress={() => setIsHealthFormVisible(true)}
      >
        <Text style={[styles.healthButtonText, { color: colors.primary }]}>
          Modifier mes informations de santé
        </Text>
      </Pressable>

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
  recordsList: { maxHeight: 220, marginBottom: 20 },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  recordName: { fontSize: 15, flex: 1 },
  recordValue: { fontSize: 15, fontWeight: '600' },
  healthButton: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  healthButtonText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
});

