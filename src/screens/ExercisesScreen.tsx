import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';
import { SCREEN_PADDING, spacing } from '../theme/tokens';
import RestTimerButton from '../components/RestTimerButton';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import type { Exercise, SetLog } from '../models';
import { confirmDestructive, keptHistoryNote, pluralize } from '../utils/confirm';
import { formatLoad } from '../utils/format';
import { getLocalDateKey } from '../utils/nutritionDate';
import { getSetLogDateKey } from '../utils/workoutHistory';
import { pickSquareImage } from '../utils/pickImage';
import { Button, EditableItemRow, EmptyState, IconButton, ScreenHeader } from '../components/ui';

type Props = NativeStackScreenProps<SeancesStackParamList, 'ExercisesList'>;

function describeLastSet(log: SetLog | undefined): string {
  if (!log) return 'Aucune série';
  return `Dernière : ${log.reps} × ${formatLoad(log.weightKg, log.bodyweight)}`;
}

export default function ExercisesScreen({ route, navigation }: Props) {
  const { programId, seanceId } = route.params;
  const program = useProgramStore((state) => state.programs.find((p) => p.id === programId));
  const seance = program?.seances.find((s) => s.id === seanceId);
  const removeExercise = useProgramStore((state) => state.removeExercise);
  const updateExercise = useProgramStore((state) => state.updateExercise);
  const setLogs = useProgramStore((state) => state.setLogs);
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);

  const exercises = seance?.exercises ?? [];

  // Dernière série par exercice (ligne secondaire) et séries du jour
  // (un exercice avec au moins une série aujourd'hui est « fait »).
  const { lastSetByExercise, todaySetCountByExercise } = useMemo(() => {
    const todayKey = getLocalDateKey();
    const lastSet = new Map<string, SetLog>();
    const todayCount = new Map<string, number>();
    setLogs.forEach((log) => {
      if (log.seanceId !== seanceId) return;
      const current = lastSet.get(log.exerciseId);
      if (!current || new Date(log.date).getTime() >= new Date(current.date).getTime()) {
        lastSet.set(log.exerciseId, log);
      }
      if (getSetLogDateKey(log) === todayKey) {
        todayCount.set(log.exerciseId, (todayCount.get(log.exerciseId) ?? 0) + 1);
      }
    });
    return { lastSetByExercise: lastSet, todaySetCountByExercise: todayCount };
  }, [setLogs, seanceId]);

  const doneCount = exercises.filter((exercise) => todaySetCountByExercise.has(exercise.id)).length;
  const subtitle = [program?.name, doneCount > 0 ? `${doneCount} sur ${exercises.length} fait${doneCount > 1 ? 's' : ''}` : null]
    .filter(Boolean)
    .join(' · ');

  const confirmRemoveExercise = (exercise: Exercise) => {
    const setCount = setLogs.filter((log) => log.exerciseId === exercise.id).length;
    confirmDestructive({
      title: `Supprimer « ${exercise.name || 'cet exercice'} » ?`,
      message: keptHistoryNote(setCount) || 'Aucune série enregistrée pour cet exercice.',
      onConfirm: () => removeExercise(programId, seanceId, exercise.id),
    });
  };

  const handleAddExercise = () => {
    navigation.navigate('ExerciseCatalog', { programId, seanceId });
  };

  const handlePickImage = async (exerciseId: string) => {
    const uri = await pickSquareImage();
    if (uri) updateExercise(programId, seanceId, exerciseId, { imageUri: uri });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={seance?.name || 'Séance'}
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
        actions={
          <>
            {!isEditing ? <RestTimerButton /> : null}
            {exercises.length > 0 ? (
              <Button
                label={isEditing ? 'Terminé' : 'Modifier'}
                variant={isEditing ? 'filled' : 'tinted'}
                size="sm"
                onPress={() => setIsEditing((v) => !v)}
              />
            ) : null}
            {!isEditing && exercises.length > 0 ? (
              <IconButton icon="add" label="Ajouter un exercice" variant="filled" size={32} onPress={handleAddExercise} />
            ) : null}
          </>
        }
      />

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="fitness-outline"
            title="Aucun exercice"
            message="Choisissez des exercices dans le catalogue ou créez les vôtres."
            actionLabel="Ajouter un exercice"
            onAction={handleAddExercise}
          />
        }
        renderItem={({ item }) => {
          const todaySetCount = todaySetCountByExercise.get(item.id) ?? 0;
          return (
            <EditableItemRow
              name={item.name}
              note={item.subtitle}
              meta={
                todaySetCount > 0
                  ? `${pluralize(todaySetCount, 'série')} aujourd'hui`
                  : describeLastSet(lastSetByExercise.get(item.id))
              }
              imageUri={item.imageUri}
              fallbackIcon="fitness-outline"
              isEditing={isEditing}
              isDone={todaySetCount > 0}
              namePlaceholder="Nom de l'exercice"
              notePlaceholder="Note (ex : prise serrée)"
              onPress={() => navigation.navigate('ExerciseDetail', { programId, seanceId, exerciseId: item.id })}
              onChangeName={(text) => updateExercise(programId, seanceId, item.id, { name: text })}
              onChangeNote={(text) => updateExercise(programId, seanceId, item.id, { subtitle: text })}
              onPickImage={() => handlePickImage(item.id)}
              onDelete={() => confirmRemoveExercise(item)}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl },
  separator: { height: spacing.sm },
});
