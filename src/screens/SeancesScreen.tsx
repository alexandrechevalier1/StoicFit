import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';
import { SCREEN_PADDING, spacing } from '../theme/tokens';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import type { Seance } from '../models';
import { confirmDestructive, joinLines, keptHistoryNote, pluralize } from '../utils/confirm';
import { pickSquareImage } from '../utils/pickImage';
import { Button, EditableItemRow, EmptyState, IconButton, ScreenHeader } from '../components/ui';

type Props = NativeStackScreenProps<SeancesStackParamList, 'SeancesList'>;

export default function SeancesScreen({ route, navigation }: Props) {
  const { programId } = route.params;
  const program = useProgramStore((state) => state.programs.find((p) => p.id === programId));
  const addSeance = useProgramStore((state) => state.addSeance);
  const removeSeance = useProgramStore((state) => state.removeSeance);
  const updateSeance = useProgramStore((state) => state.updateSeance);
  const setLogs = useProgramStore((state) => state.setLogs);
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);

  const seances = program?.seances ?? [];

  const confirmRemoveSeance = (seance: Seance) => {
    const exerciseCount = seance.exercises.length;
    const setCount = setLogs.filter((log) => log.seanceId === seance.id).length;
    confirmDestructive({
      title: `Supprimer « ${seance.name || 'cette séance'} » ?`,
      message: joinLines(
        exerciseCount > 0
          ? `${pluralize(exerciseCount, 'exercice')} ${exerciseCount > 1 ? 'seront supprimés' : 'sera supprimé'}.`
          : 'Cette séance est vide.',
        keptHistoryNote(setCount)
      ),
      onConfirm: () => removeSeance(programId, seance.id),
    });
  };

  const handleAddSeance = () => {
    addSeance(programId, {
      id: Date.now().toString(),
      name: 'Nouvelle séance',
      date: new Date().toISOString(),
      exercises: [],
    });
  };

  const handlePickImage = async (seanceId: string) => {
    const uri = await pickSquareImage();
    if (uri) updateSeance(programId, seanceId, { imageUri: uri });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={program?.name || 'Programme'}
        subtitle={seances.length > 0 ? pluralize(seances.length, 'séance') : undefined}
        onBack={() => navigation.goBack()}
        actions={
          seances.length > 0 ? (
            <>
              <Button
                label={isEditing ? 'Terminé' : 'Modifier'}
                variant={isEditing ? 'filled' : 'tinted'}
                size="sm"
                onPress={() => setIsEditing((v) => !v)}
              />
              {!isEditing ? (
                <IconButton icon="add" label="Ajouter une séance" variant="filled" size={32} onPress={handleAddSeance} />
              ) : null}
            </>
          ) : null
        }
      />

      <FlatList
        data={seances}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Aucune séance"
            message="Ajoutez une séance (ex. « Haut du corps »), puis ses exercices."
            actionLabel="Ajouter une séance"
            onAction={handleAddSeance}
          />
        }
        renderItem={({ item }) => (
          <EditableItemRow
            name={item.name}
            note={item.subtitle}
            meta={item.exercises.length > 0 ? pluralize(item.exercises.length, 'exercice') : 'Aucun exercice'}
            imageUri={item.imageUri}
            fallbackIcon="calendar-outline"
            isEditing={isEditing}
            namePlaceholder="Nom de la séance"
            notePlaceholder="Note (ex : Haut du corps)"
            onPress={() => navigation.navigate('ExercisesList', { programId, seanceId: item.id })}
            onChangeName={(text) => updateSeance(programId, item.id, { name: text })}
            onChangeNote={(text) => updateSeance(programId, item.id, { subtitle: text })}
            onPickImage={() => handlePickImage(item.id)}
            onDelete={() => confirmRemoveSeance(item)}
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
