import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Image,
  Alert,
  Modal,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import NumericKeypad from '../components/NumericKeypad';

type Props = NativeStackScreenProps<SeancesStackParamList, 'ExerciseDetail'>;

export default function ExerciseDetailScreen({ route, navigation }: Props) {
  const { programId, seanceId, exerciseId } = route.params;
  const exercise = useProgramStore((state) =>
    state.programs
      .find((p) => p.id === programId)
      ?.seances.find((s) => s.id === seanceId)
      ?.exercises.find((e) => e.id === exerciseId)
  );
  const updateExercise = useProgramStore((state) => state.updateExercise);
  const addSet = useProgramStore((state) => state.addSet);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddSetModalVisible, setIsAddSetModalVisible] = useState(false);
  const [repsValue, setRepsValue] = useState('');
  const [weightValue, setWeightValue] = useState('');

  const handlePickImage = async () => {
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
      updateExercise(programId, seanceId, exerciseId, { imageUri: result.assets[0].uri });
    }
  };

  const closeAddSetModal = () => {
    setIsAddSetModalVisible(false);
    setRepsValue('');
    setWeightValue('');
  };

  const handleValidateSet = () => {
    addSet(programId, seanceId, exerciseId, {
      id: Date.now().toString(),
      reps: Number(repsValue) || 0,
      weightKg: Number(weightValue) || 0,
      completed: false,
      date: new Date().toISOString(),
    });
    closeAddSetModal();
  };

  const isSameDay = (isoDate: string, reference: Date) => {
    const d = new Date(isoDate);
    return (
      d.getFullYear() === reference.getFullYear() &&
      d.getMonth() === reference.getMonth() &&
      d.getDate() === reference.getDate()
    );
  };

  const today = new Date();
  const todaySets = (exercise?.sets ?? []).filter((s) => isSameDay(s.date, today));
  const todayTotalReps = todaySets.reduce((sum, s) => sum + s.reps, 0);
  const todayTotalVolume = todaySets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
  const todayLabel = `${String(today.getDate()).padStart(2, '0')}/${String(
    today.getMonth() + 1
  ).padStart(2, '0')}`;

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
        <Pressable
          onPress={handlePickImage}
          disabled={!isEditing}
          style={styles.thumbnail}
        >
          {exercise?.imageUri ? (
            <Image source={{ uri: exercise.imageUri }} style={styles.thumbnailImage} />
          ) : (
            <Text style={styles.thumbnailPlaceholder}>📷</Text>
          )}
        </Pressable>

        <View style={styles.itemTextContainer}>
          {isEditing ? (
            <TextInput
              style={[styles.title, styles.itemTextInput]}
              value={exercise?.name}
              onChangeText={(text) =>
                updateExercise(programId, seanceId, exerciseId, { name: text })
              }
              placeholder="Nom de l'exercice"
            />
          ) : (
            <Text style={styles.title}>{exercise?.name}</Text>
          )}
        </View>

        <Pressable
          onPress={() => setIsAddSetModalVisible(true)}
          style={styles.addButton}
          hitSlop={12}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {isEditing ? (
        <TextInput
          style={[styles.subtitle, styles.itemTextInput]}
          value={exercise?.subtitle}
          onChangeText={(text) =>
            updateExercise(programId, seanceId, exerciseId, { subtitle: text })
          }
          placeholder="Sous-titre (ex: 4 séries)"
        />
      ) : (
        exercise?.subtitle ? <Text style={styles.subtitle}>{exercise.subtitle}</Text> : null
      )}

      {todaySets.length > 0 && (
        <>
          <View style={styles.recapBanner}>
            <Text style={styles.recapDate}>{todayLabel}</Text>
            <View style={styles.recapTotalsContainer}>
              <Text style={styles.recapText}>
                total {todayTotalReps} reps {todayTotalVolume} Kg
              </Text>
            </View>
          </View>

          <FlatList
            data={todaySets}
            keyExtractor={(item) => item.id}
            style={styles.setsList}
            renderItem={({ item, index }) => (
              <Text style={styles.setLine}>
                {`Série ${String(index + 1).padStart(2, ' ')}   ${String(item.reps).padStart(
                  3,
                  ' '
                )} X ${item.weightKg.toFixed(2).replace('.', ',').padStart(5, ' ')} Kg`}
              </Text>
            )}
          />
        </>
      )}

      <Modal
        visible={isAddSetModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeAddSetModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeAddSetModal}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Pressable onPress={closeAddSetModal} hitSlop={12}>
                <Text style={styles.modalCloseButton}>{'✕'}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Séries</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCounterRow}>
                <Text style={styles.modalSectionLabel}>Nombre de reps</Text>
                <Text style={styles.modalCounterValue}>{repsValue || '0'}</Text>
              </View>
              <NumericKeypad
                value={repsValue}
                onDigitPress={(digit) => setRepsValue((v) => v + digit)}
                onDeletePress={() => setRepsValue((v) => v.slice(0, -1))}
              />

              <View style={styles.modalCounterRow}>
                <Text style={styles.modalSectionLabel}>Charge</Text>
                <Text style={styles.modalCounterValue}>{weightValue || '0'} kg</Text>
              </View>
              <NumericKeypad
                value={weightValue}
                onDigitPress={(digit) => setWeightValue((v) => v + digit)}
                onDeletePress={() => setWeightValue((v) => v.slice(0, -1))}
              />

              <Pressable style={styles.modalValidateButton} onPress={handleValidateSet}>
                <Text style={styles.modalValidateButtonText}>Valider la série</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  editButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#888' },
  recapBanner: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recapDate: { fontSize: 14, fontWeight: '600', color: '#fff' },
  recapTotalsContainer: { flex: 1, alignItems: 'center' },
  recapText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  setsList: { marginTop: 12 },
  setLine: {
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 14,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  itemTextInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7CC',
    paddingVertical: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalCloseButton: { fontSize: 20, color: '#000', fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalHeaderSpacer: { width: 20 },
  modalScrollContent: { paddingBottom: 24 },
  modalCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalSectionLabel: { fontSize: 14, color: '#888' },
  modalCounterValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalValidateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalValidateButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
