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
import type { Program } from '../models';
import type { SeancesStackParamList } from '../navigation/RootNavigator';

// Nombre de dernières séances prises en compte pour le récap de progrès
const RECENT_SEANCES_COUNT = 5;

function computeRecentStats(programs: Program[]) {
  const allSeances = programs.flatMap((p) => p.seances);
  const recent = [...allSeances]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_SEANCES_COUNT);

  const totalVolumeKg = recent.reduce(
    (sum, seance) =>
      sum +
      seance.exercises.reduce(
        (exSum, e) =>
          exSum + e.sets.reduce((setSum, s) => setSum + s.reps * s.weightKg, 0),
        0
      ),
    0
  );

  const lastSeanceDate = recent[0]?.date;

  return {
    seanceCount: recent.length,
    totalVolumeKg,
    lastSeanceDate,
  };
}

type Props = NativeStackScreenProps<SeancesStackParamList, 'ProgramsList'>;

export default function WorkoutsScreen({ navigation }: Props) {
  const programs = useProgramStore((state) => state.programs);
  const addProgram = useProgramStore((state) => state.addProgram);
  const removeProgram = useProgramStore((state) => state.removeProgram);
  const updateProgram = useProgramStore((state) => state.updateProgram);
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);

  const stats = useMemo(() => computeRecentStats(programs), [programs]);

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

      <Text style={[styles.title, styles.progressTitle, { color: colors.text }]}>Mes progrès</Text>
      {stats.seanceCount === 0 ? (
        <Text style={[styles.empty, { color: colors.subtleText }]}>Pas encore de données de progression.</Text>
      ) : (
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.progressLine, { color: colors.text }]}>
            {stats.seanceCount} dernière(s) séance(s) enregistrée(s)
          </Text>
          <Text style={[styles.progressLine, { color: colors.text }]}>
            Volume total soulevé : {stats.totalVolumeKg} kg
          </Text>
          {stats.lastSeanceDate && (
            <Text style={[styles.progressLine, { color: colors.text }]}>
              Dernière séance : {new Date(stats.lastSeanceDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}
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
  progressCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  progressLine: { fontSize: 15 },
});
