import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, SCREEN_PADDING, spacing, typography } from '../theme/tokens';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import type { SetLog as ExerciseSet } from '../models';
import NumericKeypad from '../components/NumericKeypad';
import DatePicker from '../components/DatePicker';
import RestTimerButton from '../components/RestTimerButton';
import IntensityIndicator from '../components/IntensityIndicator';
import { appendKeypadInput, parseDecimal, toDecimalInput } from '../utils/number';
import { confirmDestructive, pluralize } from '../utils/confirm';
import { formatInteger, formatRelativeDay, formatWeight } from '../utils/format';
import { pickSquareImage } from '../utils/pickImage';
import { Button, EmptyState, IconButton, ScreenHeader, Sheet, Thumbnail } from '../components/ui';

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

/** Charge lisible : « 100 kg », « PDC », « PDC + 10 kg ». */
const formatLoad = (weightKg: number, bodyweight?: boolean) => {
  if (bodyweight) return weightKg > 0 ? `PDC + ${formatWeight(weightKg)} kg` : 'PDC';
  return `${formatWeight(weightKg)} kg`;
};

/** Même chose pendant la saisie au pavé (la valeur est encore une chaîne, ex. « 22, »). */
const formatLoadInput = (value: string, bodyweight: boolean) => {
  if (bodyweight) return value ? `PDC + ${value} kg` : 'PDC';
  return `${value || '0'} kg`;
};

const dateKeyToIso = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
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

  const handlePickImage = async () => {
    const uri = await pickSquareImage();
    if (uri) updateExercise(programId, seanceId, exerciseId, { imageUri: uri });
  };

  const openAddSetModal = () => {
    if (lastSet) {
      setRepsValue(String(lastSet.reps));
      setWeightValue(toDecimalInput(lastSet.weightKg));
      setWeightBodyweight(lastSet.bodyweight ?? false);
    }
    setIsAddSetModalVisible(true);
  };

  // Meilleure série : charge la plus lourde, puis le plus de reps à charge égale.
  const bestSet = useMemo(
    () =>
      exerciseSets.reduce<ExerciseSet | undefined>(
        (best, log) =>
          !best || log.weightKg > best.weightKg || (log.weightKg === best.weightKg && log.reps > best.reps)
            ? log
            : best,
        undefined
      ),
    [exerciseSets]
  );

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
      // Ordre chronologique : la série 1 est la première faite dans la journée.
      sets: [...group.sets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));

  const inputStyle = [styles.input, { backgroundColor: colors.cardMuted, color: colors.text }];

  const renderLoadEditor = (
    reps: string,
    setReps: (updater: (v: string) => string) => void,
    weight: string,
    setWeight: (updater: (v: string) => string) => void,
    bodyweight: boolean,
    setBodyweight: (updater: (v: boolean) => boolean) => void
  ) => (
    <>
      <View style={styles.counterRow}>
        <Text style={[typography.captionStrong, styles.overline, { color: colors.subtleText }]}>Répétitions</Text>
        <Text style={[typography.numberLarge, { color: colors.text }]}>{reps || '0'}</Text>
      </View>
      <NumericKeypad
        value={reps}
        onDigitPress={(digit) => setReps((v) => appendReps(v, digit))}
        onDeletePress={() => setReps((v) => v.slice(0, -1))}
      />

      <View style={styles.counterRow}>
        <Text style={[typography.captionStrong, styles.overline, { color: colors.subtleText }]}>Charge</Text>
        <Text style={[typography.numberLarge, { color: colors.text }]}>{formatLoadInput(weight, bodyweight)}</Text>
      </View>
      <NumericKeypad
        value={weight}
        allowDecimal
        onDigitPress={(digit) => setWeight((v) => appendWeight(v, digit))}
        onDeletePress={() => {
          if (weight) {
            setWeight((v) => v.slice(0, -1));
          } else {
            setBodyweight(() => false);
          }
        }}
        extraKey={{ label: 'Poids du corps', active: bodyweight, onPress: () => setBodyweight((v) => !v) }}
      />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={exercise?.name || 'Exercice'}
        subtitle={seance?.name}
        onBack={() => navigation.goBack()}
        actions={
          <>
            {!isEditing ? <RestTimerButton /> : null}
            <Button
              label={isEditing ? 'Terminé' : 'Modifier'}
              variant={isEditing ? 'filled' : 'tinted'}
              size="sm"
              onPress={() => setIsEditing((v) => !v)}
            />
          </>
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isEditing ? (
          <View style={[styles.card, styles.editCard, { backgroundColor: colors.card }]}>
            <Thumbnail
              imageUri={exercise?.imageUri}
              fallbackIcon="fitness-outline"
              size={64}
              editable
              onPress={handlePickImage}
            />
            <View style={styles.editFields}>
              <TextInput
                style={[typography.bodyStrong, inputStyle]}
                value={exercise?.name}
                onChangeText={(text) => updateExercise(programId, seanceId, exerciseId, { name: text })}
                placeholder="Nom de l'exercice"
                placeholderTextColor={colors.subtleText}
              />
              <TextInput
                style={[typography.caption, inputStyle]}
                value={exercise?.subtitle}
                onChangeText={(text) => updateExercise(programId, seanceId, exerciseId, { subtitle: text })}
                placeholder="Note (ex : prise serrée)"
                placeholderTextColor={colors.subtleText}
              />
            </View>
          </View>
        ) : exerciseSets.length > 0 ? (
          <View style={[styles.card, styles.summaryCard, { backgroundColor: colors.card }]}>
            <Thumbnail imageUri={exercise?.imageUri} fallbackIcon="fitness-outline" size={56} />
            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <Text style={[typography.caption, { color: colors.subtleText }]}>Record</Text>
                <Text style={[typography.number, { color: colors.text }]} numberOfLines={1}>
                  {bestSet ? `${bestSet.reps} × ${formatLoad(bestSet.weightKg, bestSet.bodyweight)}` : '—'}
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={[typography.caption, { color: colors.subtleText }]}>Séances</Text>
                <Text style={[typography.number, { color: colors.text }]}>{setsByDate.length}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {exercise?.subtitle && !isEditing ? (
          <Text style={[typography.caption, { color: colors.subtleText }]}>{exercise.subtitle}</Text>
        ) : null}

        {setsByDate.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="Aucune série"
            message="Ajoutez votre première série : les reps et la charge seront pré-remplies la fois suivante."
          />
        ) : null}

        {setsByDate.map((group) => {
          const note = seance?.notesByDate?.[group.dateKey];
          const dayLabel = formatRelativeDay(dateKeyToIso(group.dateKey));
          return (
            <View key={group.dateKey} style={[styles.card, { backgroundColor: colors.card }]}>
              <Pressable
                onPress={() => openNoteModal(group.dateKey)}
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel}, ${note ? 'voir la note' : 'ajouter une note'}`}
                style={({ pressed }) => [styles.groupHeader, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.flex}>
                  <Text style={[typography.headline, styles.capitalize, { color: colors.text }]}>{dayLabel}</Text>
                  <Text style={[typography.caption, { color: colors.subtleText }]}>
                    {[
                      pluralize(group.sets.length, 'série'),
                      pluralize(group.totalReps, 'rep'),
                      group.totalVolume > 0 ? `${formatInteger(group.totalVolume)} kg` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {isEditing ? (
                  <IconButton
                    icon="calendar-outline"
                    label="Déplacer à une autre date"
                    variant="tinted"
                    size={36}
                    onPress={() => openGroupDateModal(group.dateKey)}
                  />
                ) : null}
                <Ionicons
                  name={note ? 'document-text' : 'document-text-outline'}
                  size={20}
                  color={note ? colors.primary : colors.subtleText}
                />
              </Pressable>

              {note ? (
                <Text
                  style={[typography.caption, styles.notePreview, { color: colors.text, backgroundColor: colors.cardMuted }]}
                  numberOfLines={2}
                >
                  {note}
                </Text>
              ) : null}

              <View>
                {group.sets.map((item, index) => (
                  <Pressable
                    key={item.id}
                    disabled={!isEditing}
                    onPress={() => openEditSetModal(item)}
                    accessibilityLabel={isEditing ? `Modifier la série ${index + 1}` : undefined}
                    style={({ pressed }) => [
                      styles.setRow,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                      isEditing && pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View style={[styles.setIndex, { backgroundColor: colors.cardMuted }]}>
                      <Text style={[typography.captionStrong, { color: colors.subtleText }]}>{index + 1}</Text>
                    </View>
                    <Text style={[typography.number, styles.flex, { color: colors.text }]}>
                      {item.reps}
                      <Text style={{ color: colors.subtleText }}> × </Text>
                      {formatLoad(item.weightKg, item.bodyweight)}
                    </Text>
                    <IntensityIndicator value={item.intensity} onChange={(intensity) => updateSet(item.id, { intensity })} />
                    {isEditing ? <Ionicons name="create-outline" size={18} color={colors.primary} /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {!isEditing ? (
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button label="Ajouter une série" icon="add" onPress={openAddSetModal} />
        </View>
      ) : null}

      <Sheet visible={isAddSetModalVisible} onClose={closeAddSetModal} title="Nouvelle série" size="large">
        {renderLoadEditor(repsValue, setRepsValue, weightValue, setWeightValue, weightBodyweight, setWeightBodyweight)}
        <Button label="Valider la série" icon="checkmark" onPress={handleValidateSet} />
      </Sheet>

      <Sheet visible={isEditSetModalVisible} onClose={closeEditSetModal} title="Modifier la série" size="large">
        <View style={styles.fieldGroup}>
          <Text style={[typography.captionStrong, styles.overline, { color: colors.subtleText }]}>Date</Text>
          <DatePicker value={editDateValue} onChange={setEditDateValue} />
        </View>
        {renderLoadEditor(
          editRepsValue,
          setEditRepsValue,
          editWeightValue,
          setEditWeightValue,
          editWeightBodyweight,
          setEditWeightBodyweight
        )}
        <Button label="Enregistrer" icon="checkmark" onPress={handleSaveSetEdition} />
        <Button label="Supprimer la série" icon="trash-outline" variant="plain" tone="danger" onPress={handleDeleteSet} />
      </Sheet>

      <Sheet visible={isGroupDateModalVisible} onClose={closeGroupDateModal} title="Déplacer la séance">
        <View style={styles.fieldGroup}>
          <Text style={[typography.captionStrong, styles.overline, { color: colors.subtleText }]}>Nouvelle date</Text>
          <DatePicker value={groupDateValue} onChange={setGroupDateValue} />
        </View>
        <Text style={[typography.caption, { color: colors.subtleText }]}>
          Toutes les séries de ce jour seront déplacées vers cette date.
        </Text>
        <Button label="Déplacer la séance" icon="calendar-outline" onPress={handleSaveGroupDate} />
      </Sheet>

      <Sheet
        visible={isNoteModalVisible}
        onClose={closeNoteModal}
        title={selectedNoteDateKey ? `Note · ${formatRelativeDay(dateKeyToIso(selectedNoteDateKey))}` : 'Note'}
      >
        <TextInput
          style={[typography.body, styles.noteInput, { color: colors.text, backgroundColor: colors.cardMuted }]}
          value={noteValue}
          onChangeText={(text) => setNoteValue(text.slice(0, NOTE_MAX_LENGTH))}
          placeholder="Sensations, réglages de la machine, douleurs…"
          placeholderTextColor={colors.subtleText}
          multiline
          maxLength={NOTE_MAX_LENGTH}
          textAlignVertical="top"
        />
        <Text style={[typography.caption, styles.noteCounter, { color: colors.subtleText }]}>
          {noteValue.length}/{NOTE_MAX_LENGTH}
        </Text>
        <Button label="Enregistrer la note" onPress={handleSaveNote} />
        {isEditing && selectedNoteDateKey ? (
          <Button label="Déplacer la séance…" icon="calendar-outline" variant="tinted" onPress={openDateModalFromNote} />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xl, gap: spacing.md },
  card: { borderRadius: radius.lg, padding: spacing.lg },
  editCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editFields: { flex: 1, gap: spacing.sm },
  input: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  summaryMetrics: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  summaryMetric: { gap: 2, flexShrink: 1 },
  capitalize: { textTransform: 'capitalize' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  notePreview: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  setIndex: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  overline: { textTransform: 'uppercase', letterSpacing: 0.6 },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  fieldGroup: { gap: spacing.sm },
  noteInput: { borderRadius: radius.md, padding: spacing.md, minHeight: 120 },
  noteCounter: { textAlign: 'right', marginTop: -spacing.sm },
});
