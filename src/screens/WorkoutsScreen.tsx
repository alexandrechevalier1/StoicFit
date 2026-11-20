import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, SCREEN_PADDING, spacing, typography } from '../theme/tokens';
import type { CompletedSeance, Program } from '../models';
import { confirmDestructive, joinLines, keptHistoryNote, pluralize } from '../utils/confirm';
import { formatInteger, formatRelativeDay, formatWeight } from '../utils/format';
import { pickSquareImage } from '../utils/pickImage';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import type { SeancesStackParamList } from '../navigation/RootNavigator';
import { Button, EditableItemRow, EmptyState, IconButton, ScreenHeader } from '../components/ui';

type WeekStats = {
  thisWeekSeanceCount: number;
  thisWeekVolumeKg: number;
  lastSeanceDate: string | undefined;
  latestRecord: { exerciseName: string; weightKg: number; reps: number } | null;
};

function startOfWeek(): Date {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  return weekStart;
}

function computeWeekStats(history: CompletedSeance[]): WeekStats {
  const chronological = [...history].sort(
    (a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime()
  );

  const weekStartMs = startOfWeek().getTime();
  const thisWeekEntries = history.filter((entry) => {
    const endedAt = new Date(entry.endedAt).getTime();
    return Number.isFinite(endedAt) && endedAt >= weekStartMs;
  });

  // Dernier record battu : on rejoue l'historique dans l'ordre et on garde
  // la dernière série qui a dépassé le meilleur précédent de son exercice.
  let latestRecord: WeekStats['latestRecord'] = null;
  const bestByExercise = new Map<string, { weightKg: number; reps: number }>();

  chronological.forEach((entry) => {
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
          latestRecord = { exerciseName: exercise.name, weightKg: setItem.weightKg, reps: setItem.reps };
        }
      });
    });
  });

  return {
    thisWeekSeanceCount: thisWeekEntries.length,
    thisWeekVolumeKg: thisWeekEntries.reduce((sum, entry) => sum + entry.totalVolumeKg, 0),
    lastSeanceDate: chronological[chronological.length - 1]?.endedAt,
    latestRecord,
  };
}

function formatSet(weightKg: number, reps: number): string {
  return weightKg > 0 ? `${formatWeight(weightKg)} kg × ${reps}` : pluralize(reps, 'rep');
}

type Props = NativeStackScreenProps<SeancesStackParamList, 'ProgramsList'>;

export default function WorkoutsScreen({ navigation }: Props) {
  const programs = useProgramStore((state) => state.programs);
  const history = useWorkoutHistory();
  const setLogs = useProgramStore((state) => state.setLogs);
  const addProgram = useProgramStore((state) => state.addProgram);
  const removeProgram = useProgramStore((state) => state.removeProgram);
  const updateProgram = useProgramStore((state) => state.updateProgram);
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);

  const stats = useMemo(() => computeWeekStats(history), [history]);

  const confirmRemoveProgram = (program: Program) => {
    const seanceCount = program.seances.length;
    const exerciseCount = program.seances.reduce((sum, s) => sum + s.exercises.length, 0);
    const setCount = setLogs.filter((log) => log.programId === program.id).length;
    confirmDestructive({
      title: `Supprimer « ${program.name || 'ce programme'} » ?`,
      message: joinLines(
        seanceCount === 0
          ? 'Ce programme est vide.'
          : exerciseCount === 0
            ? `${pluralize(seanceCount, 'séance')} ${seanceCount > 1 ? 'seront supprimées' : 'sera supprimée'}.`
            : `${pluralize(seanceCount, 'séance')} et ${pluralize(exerciseCount, 'exercice')} seront supprimés.`,
        keptHistoryNote(setCount)
      ),
      onConfirm: () => removeProgram(program.id),
    });
  };

  const handleAddProgram = () => {
    addProgram({ id: Date.now().toString(), name: 'Nouveau programme', seances: [] });
  };

  const handlePickImage = async (programId: string) => {
    const uri = await pickSquareImage();
    if (uri) updateProgram(programId, { imageUri: uri });
  };

  const weekCard =
    history.length > 0 ? (
      <View style={[styles.weekCard, { backgroundColor: colors.card }]}>
        <Text style={[typography.captionStrong, styles.overline, { color: colors.subtleText }]}>
          Cette semaine
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[typography.numberLarge, { color: colors.text }]}>{stats.thisWeekSeanceCount}</Text>
            <Text style={[typography.caption, { color: colors.subtleText }]}>
              {stats.thisWeekSeanceCount > 1 ? 'séances' : 'séance'}
            </Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metric}>
            <Text style={[typography.numberLarge, { color: colors.text }]}>
              {formatInteger(stats.thisWeekVolumeKg)}
              <Text style={[typography.headline, { color: colors.subtleText }]}> kg</Text>
            </Text>
            <Text style={[typography.caption, { color: colors.subtleText }]}>volume soulevé</Text>
          </View>
        </View>

        <View style={[styles.weekFooter, { borderTopColor: colors.border }]}>
          {stats.lastSeanceDate ? (
            <View style={styles.footerLine}>
              <Ionicons name="time-outline" size={16} color={colors.subtleText} />
              <Text style={[typography.caption, { color: colors.subtleText }]}>
                Dernière séance : <Text style={{ color: colors.text }}>{formatRelativeDay(stats.lastSeanceDate)}</Text>
              </Text>
            </View>
          ) : null}
          {stats.latestRecord ? (
            <View style={styles.footerLine}>
              <Ionicons name="trophy-outline" size={16} color={colors.warning} />
              <Text style={[typography.caption, styles.flexShrink, { color: colors.subtleText }]} numberOfLines={1}>
                Dernier record :{' '}
                <Text style={{ color: colors.text }}>
                  {stats.latestRecord.exerciseName} · {formatSet(stats.latestRecord.weightKg, stats.latestRecord.reps)}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    ) : null;

  const listHeader = (
    <View style={styles.listHeader}>
      {weekCard}
      <View style={styles.sectionHeader}>
        <Text style={[typography.title, { color: colors.text }]}>Programmes</Text>
        {programs.length > 0 ? (
          <View style={styles.sectionActions}>
            <Button
              label={isEditing ? 'Terminé' : 'Modifier'}
              variant={isEditing ? 'filled' : 'tinted'}
              size="sm"
              onPress={() => setIsEditing((v) => !v)}
            />
            {!isEditing ? (
              <IconButton icon="add" label="Ajouter un programme" variant="filled" size={32} onPress={handleAddProgram} />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Sport" />
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon="barbell-outline"
            title="Aucun programme"
            message="Un programme regroupe plusieurs séances, par exemple « Push / Pull / Legs »."
            actionLabel="Créer un programme"
            onAction={handleAddProgram}
          />
        }
        renderItem={({ item }) => (
          <EditableItemRow
            name={item.name}
            note={item.subtitle}
            meta={item.seances.length > 0 ? pluralize(item.seances.length, 'séance') : 'Aucune séance'}
            imageUri={item.imageUri}
            fallbackIcon="barbell-outline"
            isEditing={isEditing}
            namePlaceholder="Nom du programme"
            notePlaceholder="Note (ex : 3 jours par semaine)"
            onPress={() => navigation.navigate('SeancesList', { programId: item.id })}
            onChangeName={(text) => updateProgram(item.id, { name: text })}
            onChangeNote={(text) => updateProgram(item.id, { subtitle: text })}
            onPickImage={() => handlePickImage(item.id)}
            onDelete={() => confirmRemoveProgram(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl },
  listHeader: { gap: spacing.xl, marginBottom: spacing.md },
  separator: { height: spacing.sm },
  weekCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  overline: { textTransform: 'uppercase', letterSpacing: 0.6 },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, gap: 2 },
  metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: spacing.lg },
  weekFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  footerLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flexShrink: { flexShrink: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
