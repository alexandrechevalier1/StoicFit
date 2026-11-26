import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CompletedSeance } from '../models';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/tokens';
import { pluralize } from '../utils/confirm';
import { formatDuration, formatInteger, formatLoad } from '../utils/format';
import { parseLocalDateKey } from '../utils/nutritionDate';
import { INTENSITY_LABELS, intensityColor } from './IntensityIndicator';
import { Button, Sheet } from './ui';

type Props = {
  dateKey: string | null;
  seances: CompletedSeance[];
  onClose: () => void;
  /** Ouvre la séance (modèle) si elle existe encore ; absent sinon. */
  canOpenSeance: (seance: CompletedSeance) => boolean;
  onOpenSeance: (seance: CompletedSeance) => void;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function formatDayTitle(dateKey: string) {
  const label = parseLocalDateKey(dateKey).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Récapitulatif des séances d'une journée, ouvert depuis le calendrier. */
export default function SeanceDaySheet({ dateKey, seances, onClose, canOpenSeance, onOpenSeance }: Props) {
  const colors = useThemeColors();
  // On garde le dernier jour affiché pendant l'animation de fermeture.
  const shown = useRef({ dateKey, seances });
  if (dateKey) shown.current = { dateKey, seances };
  const visibleDateKey = shown.current.dateKey;

  return (
    <Sheet visible={dateKey != null} onClose={onClose} title={visibleDateKey ? formatDayTitle(visibleDateKey) : ''}>
      {shown.current.seances.map((seance, seanceIndex) => {
        const setCount = seance.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
        const timeRange =
          seance.durationMinutes > 0
            ? `${formatTime(seance.startedAt)} – ${formatTime(seance.endedAt)}`
            : formatTime(seance.startedAt);

        return (
          <View
            key={seance.id}
            style={[
              styles.seance,
              seanceIndex > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
            ]}
          >
            <View style={styles.seanceHeader}>
              <Text style={[typography.title, { color: colors.text }]}>{seance.seanceName || 'Séance'}</Text>
              <Text style={[typography.caption, { color: colors.subtleText }]}>
                {[seance.programName, timeRange].filter(Boolean).join(' · ')}
              </Text>
            </View>

            <View style={[styles.kpis, { backgroundColor: colors.cardMuted }]}>
              {seance.durationMinutes > 0 ? (
                <Kpi label="Durée" value={formatDuration(seance.durationMinutes)} />
              ) : null}
              {seance.totalVolumeKg > 0 ? (
                <Kpi label="Volume" value={`${formatInteger(seance.totalVolumeKg)} kg`} />
              ) : null}
              <Kpi label={setCount > 1 ? 'Séries' : 'Série'} value={String(setCount)} />
              <Kpi label="Reps" value={formatInteger(seance.totalReps)} />
            </View>

            {seance.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exercise}>
                <View style={styles.exerciseHeader}>
                  <Text style={[typography.bodyStrong, styles.flex, { color: colors.text }]} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.subtleText }]}>
                    {pluralize(exercise.sets.length, 'série')}
                  </Text>
                </View>

                {exercise.sets.map((set, setIndex) => (
                  <View key={set.id} style={styles.setRow}>
                    <View style={[styles.setIndex, { backgroundColor: colors.cardMuted }]}>
                      <Text style={[typography.captionStrong, styles.tabular, { color: colors.subtleText }]}>
                        {setIndex + 1}
                      </Text>
                    </View>
                    <Text style={[typography.number, styles.flex, { color: colors.text }]}>
                      {set.reps} × {formatLoad(set.weightKg, set.bodyweight)}
                    </Text>
                    {set.intensity ? (
                      <View style={styles.intensity}>
                        <View style={[styles.intensityDot, { backgroundColor: intensityColor(colors, set.intensity) }]} />
                        <Text style={[typography.caption, { color: colors.subtleText }]}>
                          {INTENSITY_LABELS[set.intensity]}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}

            {canOpenSeance(seance) ? (
              <Button
                label="Ouvrir la séance"
                icon="arrow-forward"
                variant="tinted"
                onPress={() => onOpenSeance(seance)}
              />
            ) : null}
          </View>
        );
      })}
    </Sheet>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.kpi}>
      <Text style={[typography.number, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.subtleText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  seance: { gap: spacing.md, paddingTop: spacing.sm },
  seanceHeader: { gap: 2 },
  kpis: { flexDirection: 'row', borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  kpi: { flex: 1, alignItems: 'center', gap: 2 },
  exercise: { gap: spacing.sm },
  exerciseHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  setIndex: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  intensity: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  intensityDot: { width: 8, height: 8, borderRadius: radius.pill },
});
