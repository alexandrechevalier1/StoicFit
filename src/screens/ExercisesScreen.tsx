import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';
import { SCREEN_PADDING, spacing } from '../theme/tokens';
import RestTimerButton from '../components/RestTimerButton';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import type { Exercise, SetLog } from '../models';
import { confirmDestructive, keptHistoryNote } from '../utils/confirm';
import { formatWeight } from '../utils/format';
import { pickSquareImage } from '../utils/pickImage';
import { Button, EditableItemRow, EmptyState, IconButton, ScreenHeader } from '../components/ui';

type Props = NativeStackScreenProps<SeancesStackParamList, 'ExercisesList'>;

function describeLastSet(log: SetLog | undefined): string {
  if (!log) return 'Aucune série';
  const load = log.bodyweight
    ? log.weightKg > 0
      ? `PDC + ${formatWeight(log.weightKg)} kg`
      : 'PDC'
    : `${formatWeight(log.weightKg)} kg`;
  return `Dernière : ${log.reps} × ${load}`;
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

  // Dernière série enregistrée par exercice, pour la ligne secondaire.
  const lastSetByExercise = useMemo(() => {
    const map = new Map<string, SetLog>();
    setLogs.forEach((log) => {
      if (log.seanceId !== seanceId) return;
      const current = map.get(log.exerciseId);
      if (!current || new Date(log.date).getTime() >= new Date(current.date).getTime()) {
        map.set(log.exerciseId, log);
      }
    });
    return map;
  }, [setLogs, seanceId]);

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
        subtitle={program?.name}
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
        renderItem={({ item }) => (
          <EditableItemRow
            name={item.name}
            note={item.subtitle}
            meta={describeLastSet(lastSetByExercise.get(item.id))}
            imageUri={item.imageUri}
            fallbackIcon="fitness-outline"
            isEditing={isEditing}
            namePlaceholder="Nom de l'exercice"
            notePlaceholder="Note (ex : prise serrée)"
            onPress={() => navigation.navigate('ExerciseDetail', { programId, seanceId, exerciseId: item.id })}
            onChangeName={(text) => updateExercise(programId, seanceId, item.id, { name: text })}
            onChangeNote={(text) => updateExercise(programId, seanceId, item.id, { subtitle: text })}
            onPickImage={() => handlePickImage(item.id)}
            onDelete={() => confirmRemoveExercise(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl },
  separator: { height: spacing.sm },
});
