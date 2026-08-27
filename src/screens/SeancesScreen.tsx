import { useState } from 'react';
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
import type { SeancesStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<SeancesStackParamList, 'SeancesList'>;

export default function SeancesScreen({ route, navigation }: Props) {
  const { programId } = route.params;
  const program = useProgramStore((state) =>
    state.programs.find((p) => p.id === programId)
  );
  const addSeance = useProgramStore((state) => state.addSeance);
  const removeSeance = useProgramStore((state) => state.removeSeance);
  const updateSeance = useProgramStore((state) => state.updateSeance);
  const [isEditing, setIsEditing] = useState(false);

  const seances = program?.seances ?? [];

  const handleAddSeance = () => {
    addSeance(programId, {
      id: Date.now().toString(),
      name: 'Nouvelle séance',
      date: new Date().toISOString(),
      exercises: [],
    });
  };

  const handlePickImage = async (seanceId: string) => {
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
      updateSeance(programId, seanceId, { imageUri: result.assets[0].uri });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>{'‹ Retour'}</Text>
        </Pressable>
        <Pressable onPress={() => setIsEditing((v) => !v)} hitSlop={12}>
          <Text style={styles.editButton}>{isEditing ? 'Terminé' : 'Modifier'}</Text>
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Séance</Text>
          {program && <Text style={styles.programSubtitle}>{program.name}</Text>}
        </View>
        <Pressable onPress={handleAddSeance} style={styles.addButton} hitSlop={12}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.listContainer}>
      {seances.length === 0 && !isEditing ? (
        <Text style={styles.empty}>Aucune séance pour le moment.</Text>
      ) : (
        <FlatList
          data={seances}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.item}
              onPress={() =>
                !isEditing &&
                navigation.navigate('ExercisesList', {
                  programId,
                  seanceId: item.id,
                })
              }
              disabled={isEditing}
            >
              <Pressable
                onPress={() => handlePickImage(item.id)}
                disabled={!isEditing}
                style={styles.thumbnail}
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
                    style={[styles.itemText, styles.itemTextInput]}
                    value={item.name}
                    onChangeText={(text) => updateSeance(programId, item.id, { name: text })}
                    placeholder="Nom de la séance"
                  />
                ) : (
                  <Text style={styles.itemText}>{item.name}</Text>
                )}

                {isEditing ? (
                  <TextInput
                    style={[styles.itemSubtitle, styles.itemTextInput]}
                    value={item.subtitle}
                    onChangeText={(text) => updateSeance(programId, item.id, { subtitle: text })}
                    placeholder="Sous-titre (ex: 3 exercices)"
                  />
                ) : (
                  item.subtitle ? (
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  ) : null
                )}
              </View>

              {isEditing && (
                <Pressable onPress={() => removeSeance(programId, item.id)} hitSlop={12}>
                  <Text style={styles.deleteButton}>Supprimer</Text>
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
  backButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  programSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  listContainer: { flex: 1 },
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
});
