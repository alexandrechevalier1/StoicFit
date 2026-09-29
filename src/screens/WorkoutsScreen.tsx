import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';
import type { CompletedSeance } from '../models';
import type { SeancesStackParamList } from '../navigation/RootNavigator';

// Nombre de dernières séances prises en compte pour le récap de progrès
const RECENT_COMPLETED_SEANCES_COUNT = 5;

type WorkoutPreviewStats = {
  seanceCount: number;
  totalVolumeKg: number;
  lastSeanceDate: string | undefined;
  thisWeekSeanceCount: number;
  thisWeekVolumeKg: number;
  latestRecord: { exerciseName: string; weightKg: number; reps: number } | null;
};

function computeRecentStats(history: CompletedSeance[]): WorkoutPreviewStats {
  const recent = [...history]
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    .slice(0, RECENT_COMPLETED_SEANCES_COUNT);

  const totalVolumeKg = recent.reduce((sum, entry) => sum + entry.totalVolumeKg, 0);

  const lastSeanceDate = recent[0]?.endedAt;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const offset = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - offset);

  const thisWeekEntries = history.filter((entry) => {
    const endedAt = new Date(entry.endedAt).getTime();
    return Number.isFinite(endedAt) && endedAt >= weekStart.getTime();
  });

  const thisWeekVolumeKg = thisWeekEntries.reduce((sum, entry) => sum + entry.totalVolumeKg, 0);

  let latestRecord: { exerciseName: string; weightKg: number; reps: number } | null = null;
  const bestByExercise = new Map<string, { weightKg: number; reps: number }>();

  [...history]
    .sort((a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime())
    .forEach((entry) => {
      entry.exercises.forEach((exercise) => {
        const key = exercise.name.trim().toLocaleLowerCase();

        exercise.sets.forEach((setItem) => {
          const best = bestByExercise.get(key);
          const isBetter =
            !best ||
            setItem.weightKg > best.weightKg ||
            (setItem.weightKg === best.weightKg && setItem.reps > best.reps);

          if (isBetter) {
            bestByExercise.set(key, { weightKg: setItem.weightKg, reps: setItem.reps });
            latestRecord = {
              exerciseName: exercise.name,
              weightKg: setItem.weightKg,
              reps: setItem.reps,
            };
          }
        });
      });
    });

  return {
    seanceCount: recent.length,
    totalVolumeKg,
    lastSeanceDate,
    thisWeekSeanceCount: thisWeekEntries.length,
    thisWeekVolumeKg,
    latestRecord,
  };
}

type Props = NativeStackScreenProps<SeancesStackParamList, 'ProgramsList'>;

export default function WorkoutsScreen({ navigation }: Props) {
  const programs = useProgramStore((state) => state.programs);
  const history = useProgramStore((state) => state.history);
  const addProgram = useProgramStore((state) => state.addProgram);
  const removeProgram = useProgramStore((state) => state.removeProgram);
  const updateProgram = useProgramStore((state) => state.updateProgram);
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);

  const stats = useMemo(() => computeRecentStats(history), [history]);

  const handleAddProgram = () => {
    addProgram({
      id: Date.now().toString(),
      name: 'Nouveau programme',
      seances: [],
    });
  };

  const handlePickImage = async (programId: string) => {
    if (!isEditing) return;

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
      updateProgram(programId, { imageUri: result.assets[0].uri });
    }
  };

  const handlePressProgram = (programId: string) => {
    if (isEditing) return;
    navigation.navigate('SeancesList', { programId });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>Sports</Text>

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Mes Programmes</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleAddProgram}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            hitSlop={12}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
          <Pressable onPress={() => setIsEditing((v) => !v)} hitSlop={12}>
            <Text style={[styles.editButton, { color: colors.primary }]}>
              {isEditing ? 'Terminé' : 'Modifier'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.listContainer}>
      {programs.length === 0 && !isEditing ? (
        <Text style={[styles.empty, { color: colors.subtleText }]}>Aucun programme pour le moment.</Text>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.item} onPress={() => handlePressProgram(item.id)}>
              <Pressable
                onPress={() => handlePickImage(item.id)}
                disabled={!isEditing}
                style={[styles.thumbnail, { backgroundColor: colors.card }]}
              >
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.thumbnailImage} />
                ) : (
                  <Text style={styles.thumbnailPlaceholder}>📷</Text>
                )}
              </Pressable>

              <View style={styles.itemTextContainer}>
                {isEditing ? (
                  <TextInput
                    style={[styles.itemText, styles.itemTextInput, { color: colors.text, borderBottomColor: colors.border }]}
                    value={item.name}
                    onChangeText={(text) => updateProgram(item.id, { name: text })}
                    placeholder="Nom du programme"
                    placeholderTextColor={colors.subtleText}
                  />
                ) : (
                  <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
                )}

                {isEditing ? (
                  <TextInput
                    style={[styles.itemSubtitle, styles.itemTextInput, { color: colors.subtleText, borderBottomColor: colors.border }]}
                    value={item.subtitle}
                    onChangeText={(text) => updateProgram(item.id, { subtitle: text })}
                    placeholder="Sous-titre (ex: 3 exercices)"
                    placeholderTextColor={colors.subtleText}
                  />
                ) : (
                  item.subtitle ? (
                    <Text style={[styles.itemSubtitle, { color: colors.subtleText }]}>{item.subtitle}</Text>
                  ) : null
                )}
              </View>

              {isEditing && (
                <Pressable onPress={() => removeProgram(item.id)} hitSlop={12}>
                  <Text style={[styles.deleteButton, { color: colors.danger }]}>Supprimer</Text>
                </Pressable>
              )}
            </Pressable>
          )}
        />
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  progressTitle: { marginTop: 32, marginBottom: 12 },
  listContainer: { maxHeight: '40%' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  editButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  empty: { color: '#888', marginBottom: 16 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { fontSize: 20 },
  itemTextContainer: { flex: 1 },
  itemText: { fontSize: 16 },
  itemSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  itemTextInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7CC',
    paddingVertical: 2,
  },
  deleteButton: { fontSize: 14, color: '#FF3B30' },
  analyticsBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  analyticsBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyticsBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  analyticsHeadline: {
    fontSize: 16,
    fontWeight: '700',
  },
  analyticsMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyticsMetric: {
    fontSize: 14,
    fontWeight: '600',
  },
  analyticsSubline: {
    fontSize: 13,
  },
});
