import { useMemo, useState } from 'react';
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import type { SetLog as ExerciseSet } from '../models';
import NumericKeypad from '../components/NumericKeypad';
import DatePicker from '../components/DatePicker';
import RestTimerButton from '../components/RestTimerButton';
import IntensityIndicator from '../components/IntensityIndicator';
import { appendKeypadInput, parseDecimal, toDecimalInput } from '../utils/number';
import { confirmDestructive } from '../utils/confirm';

type Props = NativeStackScreenProps<SeancesStackParamList, 'ExerciseDetail'>;

const NOTE_MAX_LENGTH = 200;

const appendReps = (current: string, key: string) =>
  appendKeypadInput(current, key, { maxIntegerDigits: 3 });

const appendWeight = (current: string, key: string) =>
  appendKeypadInput(current, key, { allowDecimal: true, maxDecimals: 2, maxIntegerDigits: 4 });

const parseReps = (value: string) => {
  const parsed = parseDecimal(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const parseWeight = (value: string) => {
  const parsed = parseDecimal(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export default function ExerciseDetailScreen({ route, navigation }: Props) {
  const { programId, seanceId, exerciseId } = route.params;
  const exercise = useProgramStore((state) =>
    state.programs
      .find((p) => p.id === programId)
      ?.seances.find((s) => s.id === seanceId)
      ?.exercises.find((e) => e.id === exerciseId)
  );
  const seance = useProgramStore((state) =>
    state.programs
      .find((p) => p.id === programId)
      ?.seances.find((s) => s.id === seanceId)
  );
  const updateExercise = useProgramStore((state) => state.updateExercise);
  const updateSeance = useProgramStore((state) => state.updateSeance);
  const addSet = useProgramStore((state) => state.addSet);
  const updateSet = useProgramStore((state) => state.updateSet);
  const removeSet = useProgramStore((state) => state.removeSet);
  const setLogs = useProgramStore((state) => state.setLogs);
  const exerciseSets = useMemo(
    () =>
      setLogs.filter(
        (log) => log.programId === programId && log.seanceId === seanceId && log.exerciseId === exerciseId
      ),
    [setLogs, programId, seanceId, exerciseId]
  );
  // Pour pré-remplir la saisie : dernière série de cet exercice, sinon dernière série
  // d'un exercice du même nom (ex. le même mouvement dans un autre programme).
  const lastSet = useMemo(() => {
    const latest = (logs: ExerciseSet[]) =>
      logs.reduce<ExerciseSet | undefined>(
        (best, log) => (!best || new Date(log.date) >= new Date(best.date) ? log : best),
        undefined
      );
    const nameKey = exercise?.name.trim().toLocaleLowerCase();
    return (
      latest(exerciseSets) ??
      (nameKey
        ? latest(setLogs.filter((log) => log.exerciseName.trim().toLocaleLowerCase() === nameKey))
        : undefined)
    );
  }, [exerciseSets, setLogs, exercise?.name]);
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddSetModalVisible, setIsAddSetModalVisible] = useState(false);
  const [isEditSetModalVisible, setIsEditSetModalVisible] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [editRepsValue, setEditRepsValue] = useState('');
  const [editWeightValue, setEditWeightValue] = useState('');
  const [repsValue, setRepsValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [weightBodyweight, setWeightBodyweight] = useState(false);
  const [editWeightBodyweight, setEditWeightBodyweight] = useState(false);
  const [isGroupDateModalVisible, setIsGroupDateModalVisible] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [groupDateValue, setGroupDateValue] = useState('');
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [selectedNoteDateKey, setSelectedNoteDateKey] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const formatSetWeight = (setItem: ExerciseSet) => {
    if (setItem.bodyweight) {
      return setItem.weightKg > 0 ? `pdc+${toDecimalInput(setItem.weightKg)}` : 'pdc';
    }
    return setItem.weightKg.toFixed(2).replace('.', ',');
  };

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
    setWeightBodyweight(false);
  };

  const closeEditSetModal = () => {
    setIsEditSetModalVisible(false);
    setSelectedSetId(null);
    setEditDateValue('');
    setEditRepsValue('');
    setEditWeightValue('');
    setEditWeightBodyweight(false);
  };

  const handleValidateSet = () => {
    addSet(programId, seanceId, exerciseId, {
      id: Date.now().toString(),
      reps: parseReps(repsValue),
      weightKg: parseWeight(weightValue),
      date: new Date().toISOString(),
      intensity: 'faible',
      bodyweight: weightBodyweight,
    });
    closeAddSetModal();
  };

  const toLocalDateInput = (isoDate: string) => {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toIsoFromLocalDateInput = (value: string): string | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (
      localDate.getFullYear() !== year ||
      localDate.getMonth() !== month - 1 ||
      localDate.getDate() !== day
    ) {
      return null;
    }

    return localDate.toISOString();
  };

  const openEditSetModal = (setItem: ExerciseSet) => {
    setSelectedSetId(setItem.id);
    setEditDateValue(toLocalDateInput(setItem.date));
    setEditRepsValue(String(setItem.reps));
    setEditWeightValue(toDecimalInput(setItem.weightKg));
    setEditWeightBodyweight(setItem.bodyweight ?? false);
    setIsEditSetModalVisible(true);
  };

  const handleSaveSetEdition = () => {
    if (!selectedSetId) {
      return;
    }

    const nextDateIso = toIsoFromLocalDateInput(editDateValue);
    if (!nextDateIso) {
      Alert.alert('Date invalide', 'Utilisez le format YYYY-MM-DD.');
      return;
    }

    updateSet(selectedSetId, {
      reps: parseReps(editRepsValue),
      weightKg: parseWeight(editWeightValue),
      bodyweight: editWeightBodyweight,
      date: nextDateIso,
    });

    closeEditSetModal();
  };

  const handleDeleteSet = () => {
    if (!selectedSetId) {
      return;
    }

    confirmDestructive({
      title: 'Supprimer la série ?',
      message: 'Cette série sera supprimée définitivement.',
      onConfirm: () => {
        removeSet(selectedSetId);
        closeEditSetModal();
      },
    });
  };

  const openGroupDateModal = (dateKey: string) => {
    if (!isEditing) {
      return;
    }
    setSelectedDateKey(dateKey);
    setGroupDateValue(dateKey);
    setIsGroupDateModalVisible(true);
  };

  const closeGroupDateModal = () => {
    setIsGroupDateModalVisible(false);
    setSelectedDateKey(null);
    setGroupDateValue('');
  };

  const handleSaveGroupDate = () => {
    if (!selectedDateKey) {
      return;
    }

    const nextDateIso = toIsoFromLocalDateInput(groupDateValue);
    if (!nextDateIso) {
      Alert.alert('Date invalide', 'Utilisez le format YYYY-MM-DD.');
      return;
    }

    if (groupDateValue === selectedDateKey) {
      closeGroupDateModal();
      return;
    }

    const group = setsByDate.find((entry) => entry.dateKey === selectedDateKey);
    if (!group) {
      closeGroupDateModal();
      return;
    }

    // Déplace toutes les séries de ce bandeau vers la nouvelle date
    group.sets.forEach((setItem) => {
      updateSet(setItem.id, { date: nextDateIso });
    });

    closeGroupDateModal();
  };

  const openNoteModal = (dateKey: string) => {
    setSelectedNoteDateKey(dateKey);
    setNoteValue(seance?.notesByDate?.[dateKey] ?? '');
    setIsNoteModalVisible(true);
  };

  const closeNoteModal = () => {
    setIsNoteModalVisible(false);
    setSelectedNoteDateKey(null);
    setNoteValue('');
  };

  const persistNote = () => {
    if (!selectedNoteDateKey) {
      return;
    }

    const nextNotes: Record<string, string> = { ...(seance?.notesByDate ?? {}) };
    const trimmed = noteValue.trim().slice(0, NOTE_MAX_LENGTH);

    if (trimmed) {
      nextNotes[selectedNoteDateKey] = trimmed;
    } else {
      delete nextNotes[selectedNoteDateKey];
    }

    updateSeance(programId, seanceId, { notesByDate: nextNotes });
  };

  const handleSaveNote = () => {
    if (!selectedNoteDateKey) {
      return;
    }

    persistNote();
    closeNoteModal();
  };

  const openDateModalFromNote = () => {
    if (!selectedNoteDateKey) {
      return;
    }

    const dateKey = selectedNoteDateKey;
    // On conserve la note en cours avant d'ouvrir le déplacement de date
    persistNote();
    closeNoteModal();
    openGroupDateModal(dateKey);
  };

  const isSameDay = (isoDate: string, reference: Date) => {
    const d = new Date(isoDate);
    return (
      d.getFullYear() === reference.getFullYear() &&
      d.getMonth() === reference.getMonth() &&
      d.getDate() === reference.getDate()
    );
  };

  const getDateKey = (isoDate: string) => {
    const d = new Date(isoDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-');
    return `${day}/${month}/${year}`;
  };

  const groupedSetsMap = new Map<
    string,
    { dateKey: string; sets: ExerciseSet[]; totalReps: number; totalVolume: number }
  >();

  for (const setItem of exerciseSets) {
    const dateKey = getDateKey(setItem.date);
    const existing = groupedSetsMap.get(dateKey);

    if (!existing) {
      groupedSetsMap.set(dateKey, {
        dateKey,
        sets: [setItem],
        totalReps: setItem.reps,
        totalVolume: setItem.reps * setItem.weightKg,
      });
      continue;
    }

    existing.sets.push(setItem);
    existing.totalReps += setItem.reps;
    existing.totalVolume += setItem.reps * setItem.weightKg;
  }

  const setsByDate = [...groupedSetsMap.values()]
    .map((group) => ({
      ...group,
      sets: [...group.sets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>{'‹ Retour'}</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <RestTimerButton />
          <Pressable onPress={() => setIsEditing((v) => !v)} hitSlop={12}>
            <Text style={[styles.editButton, { color: colors.primary }]}>
              {isEditing ? 'Terminé' : 'Modifier'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Pressable
            onPress={handlePickImage}
            disabled={!isEditing}
            style={[styles.thumbnail, { backgroundColor: colors.card }]}
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
                style={[styles.title, styles.itemTextInput, { color: colors.text, borderBottomColor: colors.border }]}
                value={exercise?.name}
                onChangeText={(text) =>
                  updateExercise(programId, seanceId, exerciseId, { name: text })
                }
                placeholder="Nom de l'exercice"
                placeholderTextColor={colors.subtleText}
              />
            ) : (
              <Text style={[styles.title, { color: colors.text }]}>{exercise?.name}</Text>
            )}
          </View>

          <Pressable
            onPress={() => {
              if (lastSet) {
                setRepsValue(String(lastSet.reps));
                setWeightValue(toDecimalInput(lastSet.weightKg));
                setWeightBodyweight(lastSet.bodyweight ?? false);
              }
              setIsAddSetModalVisible(true);
            }}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            hitSlop={12}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        {isEditing ? (
          <TextInput
            style={[styles.subtitle, styles.itemTextInput, { color: colors.subtleText, borderBottomColor: colors.border }]}
            value={exercise?.subtitle}
            onChangeText={(text) =>
              updateExercise(programId, seanceId, exerciseId, { subtitle: text })
            }
            placeholder="Sous-titre (ex: 4 séries)"
            placeholderTextColor={colors.subtleText}
          />
        ) : (
          exercise?.subtitle ? <Text style={[styles.subtitle, { color: colors.subtleText }]}>{exercise.subtitle}</Text> : null
        )}

        {setsByDate.map((group) => (
          <View key={group.dateKey} style={styles.dateGroupContainer}>
            <Pressable
              onPress={() => openNoteModal(group.dateKey)}
              accessibilityRole="button"
              accessibilityLabel={`Notes de la séance du ${formatDateKey(group.dateKey)}`}
              style={({ pressed }) => [
                styles.recapBanner,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.recapDate}>{formatDateKey(group.dateKey)}</Text>
              <View style={styles.recapTotalsContainer}>
                <Text style={styles.recapText}>
                  total {group.totalReps} reps {group.totalVolume} Kg
                </Text>
              </View>
              {seance?.notesByDate?.[group.dateKey] ? (
                <Text style={styles.recapNoteIcon}>📝</Text>
              ) : null}
              {isEditing ? <Text style={styles.recapEditHint}>modifier</Text> : null}
            </Pressable>

            <View style={styles.setsList}>
              {group.sets.map((item, index) => (
                <Pressable
                  key={item.id}
                  disabled={!isEditing}
                  onPress={() => openEditSetModal(item)}
                  style={({ pressed }) => [
                    styles.setRow,
                    isEditing && styles.editableSetRow,
                    isEditing && pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.setLine, { color: colors.text, flex: 1 }]}>
                    {`Série ${String(index + 1).padStart(2, ' ')}   ${String(item.reps).padStart(
                      3,
                      ' '
                    )} X ${formatSetWeight(item).padStart(5, ' ')} Kg`}
                  </Text>
                  <IntensityIndicator
                    value={item.intensity}
                    onChange={(intensity) =>
                      updateSet(item.id, { intensity })
                    }
                  />
                  {isEditing ? (
                    <Text style={[styles.editSetHintText, { color: colors.primary }]}>modifier</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={isEditSetModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeEditSetModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeEditSetModal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Pressable onPress={closeEditSetModal} hitSlop={12}>
                <Text style={[styles.modalCloseButton, { color: colors.text }]}>{'✕'}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Modifier le log</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.editFieldGroup}>
                <Text style={[styles.editFieldLabel, { color: colors.subtleText }]}>Date</Text>
                <DatePicker value={editDateValue} onChange={setEditDateValue} />
              </View>

              <View style={styles.modalCounterRow}>
                <Text style={[styles.modalSectionLabel, { color: colors.subtleText }]}>Nombre de reps</Text>
                <Text style={[styles.modalCounterValue, { color: colors.text }]}>{editRepsValue || '0'}</Text>
              </View>
              <NumericKeypad
                value={editRepsValue}
                onDigitPress={(digit) => setEditRepsValue((v) => appendReps(v, digit))}
                onDeletePress={() => setEditRepsValue((v) => v.slice(0, -1))}
              />

              <View style={styles.modalCounterRow}>
                <Text style={[styles.modalSectionLabel, { color: colors.subtleText }]}>Charge</Text>
                <Text style={[styles.modalCounterValue, { color: colors.text }]}>
                  {editWeightBodyweight
                    ? editWeightValue
                      ? `pdc+${editWeightValue}`
                      : 'pdc'
                    : `${editWeightValue || '0'} kg`}
                </Text>
              </View>
              <NumericKeypad
                value={editWeightValue}
                allowDecimal
                onDigitPress={(digit) => setEditWeightValue((v) => appendWeight(v, digit))}
                onDeletePress={() => {
                  if (editWeightValue) {
                    setEditWeightValue((v) => v.slice(0, -1));
                  } else {
                    setEditWeightBodyweight(false);
                  }
                }}
                extraKey={{
                  label: 'PDC',
                  active: editWeightBodyweight,
                  onPress: () => setEditWeightBodyweight((v) => !v),
                }}
              />

              <Pressable
                style={[styles.modalValidateButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveSetEdition}
              >
                <Text style={styles.modalValidateButtonText}>Enregistrer les modifications</Text>
              </Pressable>

              <Pressable
                style={[styles.modalDeleteButton, { borderColor: colors.danger }]}
                onPress={handleDeleteSet}
              >
                <Text style={[styles.modalDeleteButtonText, { color: colors.danger }]}>Supprimer la serie</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isAddSetModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeAddSetModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeAddSetModal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Pressable onPress={closeAddSetModal} hitSlop={12}>
                <Text style={[styles.modalCloseButton, { color: colors.text }]}>{'✕'}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Séries</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCounterRow}>
                <Text style={[styles.modalSectionLabel, { color: colors.subtleText }]}>Nombre de reps</Text>
                <Text style={[styles.modalCounterValue, { color: colors.text }]}>{repsValue || '0'}</Text>
              </View>
              <NumericKeypad
                value={repsValue}
                onDigitPress={(digit) => setRepsValue((v) => appendReps(v, digit))}
                onDeletePress={() => setRepsValue((v) => v.slice(0, -1))}
              />

              <View style={styles.modalCounterRow}>
                <Text style={[styles.modalSectionLabel, { color: colors.subtleText }]}>Charge</Text>
                <Text style={[styles.modalCounterValue, { color: colors.text }]}>
                  {weightBodyweight
                    ? weightValue
                      ? `pdc+${weightValue}`
                      : 'pdc'
                    : `${weightValue || '0'} kg`}
                </Text>
              </View>
              <NumericKeypad
                value={weightValue}
                allowDecimal
                onDigitPress={(digit) => setWeightValue((v) => appendWeight(v, digit))}
                onDeletePress={() => {
                  if (weightValue) {
                    setWeightValue((v) => v.slice(0, -1));
                  } else {
                    setWeightBodyweight(false);
                  }
                }}
                extraKey={{
                  label: 'PDC',
                  active: weightBodyweight,
                  onPress: () => setWeightBodyweight((v) => !v),
                }}
              />

              <Pressable style={[styles.modalValidateButton, { backgroundColor: colors.primary }]} onPress={handleValidateSet}>
                <Text style={styles.modalValidateButtonText}>Valider la série</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isGroupDateModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeGroupDateModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeGroupDateModal}>
            <Pressable
              style={[
                styles.modalSheet,
                styles.modalSheetCompact,
                { backgroundColor: colors.background, maxHeight: '90%' },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeaderRow}>
                <Pressable onPress={closeGroupDateModal} hitSlop={12}>
                  <Text style={[styles.modalCloseButton, { color: colors.text }]}>{'✕'}</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Déplacer la séance</Text>
                <View style={styles.modalHeaderSpacer} />
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.editFieldGroup}>
                  <Text style={[styles.editFieldLabel, { color: colors.subtleText }]}>Nouvelle date</Text>
                  <DatePicker value={groupDateValue} onChange={setGroupDateValue} />
                </View>

                <Text style={[styles.groupDateHint, { color: colors.subtleText }]}>
                  Toutes les séries de ce bandeau seront déplacées vers cette date.
                </Text>

                <Pressable
                  style={[styles.modalValidateButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveGroupDate}
                >
                  <Text style={styles.modalValidateButtonText}>Déplacer la séance</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isNoteModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeNoteModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
            onPress={closeNoteModal}
          >
            <Pressable
              style={[
                styles.modalSheet,
                styles.modalSheetCompact,
                { backgroundColor: colors.background, maxHeight: '90%' },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeaderRow}>
                <Pressable onPress={closeNoteModal} hitSlop={12}>
                  <Text style={[styles.modalCloseButton, { color: colors.text }]}>{'✕'}</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Notes du {selectedNoteDateKey ? formatDateKey(selectedNoteDateKey) : ''}
                </Text>
                <View style={styles.modalHeaderSpacer} />
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={[
                    styles.noteInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  value={noteValue}
                  onChangeText={(text) => setNoteValue(text.slice(0, NOTE_MAX_LENGTH))}
                  placeholder="Notes sur cette séance..."
                  placeholderTextColor={colors.subtleText}
                  multiline
                  maxLength={NOTE_MAX_LENGTH}
                  textAlignVertical="top"
                />
                <Text style={[styles.noteCounter, { color: colors.subtleText }]}>
                  {noteValue.length}/{NOTE_MAX_LENGTH}
                </Text>

                <Pressable
                  style={[styles.modalValidateButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveNote}
                >
                  <Text style={styles.modalValidateButtonText}>Enregistrer la note</Text>
                </Pressable>

                {isEditing && selectedNoteDateKey && (
                  <Pressable
                    style={[styles.modalSecondaryButton, { borderColor: colors.border }]}
                    onPress={openDateModalFromNote}
                  >
                    <Text style={[styles.modalSecondaryButtonText, { color: colors.primary }]}>
                      Déplacer la séance...
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  contentScroll: { flex: 1 },
  contentScrollContent: { paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  editSetHintText: { fontSize: 12, fontWeight: '700' },
  editableSetRow: {
    borderRadius: 8,
  },
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
  recapEditHint: { fontSize: 12, fontWeight: '700', color: '#fff' },
  recapNoteIcon: { fontSize: 14, marginLeft: 8 },
  recapTotalsContainer: { flex: 1, alignItems: 'center' },
  recapText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  dateGroupContainer: { marginBottom: 14 },
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
  modalKeyboardRoot: { flex: 1 },
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
  modalSheetCompact: { height: 'auto', paddingBottom: 24 },
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
  editFieldGroup: { marginTop: 4, marginBottom: 10 },
  groupDateHint: { fontSize: 13, lineHeight: 18 },
  editFieldLabel: { fontSize: 13, marginBottom: 6 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 120,
    marginBottom: 4,
  },
  noteCounter: { fontSize: 12, textAlign: 'right' },
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
  modalDeleteButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalDeleteButtonText: { fontSize: 15, fontWeight: '700' },
  modalSecondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSecondaryButtonText: { fontSize: 15, fontWeight: '700' },
});
