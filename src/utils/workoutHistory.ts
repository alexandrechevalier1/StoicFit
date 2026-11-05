import type { CompletedExercise, CompletedSeance, SetLog } from '../models';
import { getLocalDateKey } from './nutritionDate';

const toTime = (iso: string) => {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const getSetLogDateKey = (log: SetLog) => getLocalDateKey(new Date(log.date));

/** Volume d'une série (reps × charge). */
export const setVolume = (log: { reps: number; weightKg: number }) => log.reps * log.weightKg;

/**
 * Reconstruit l'historique des séances à partir des séries enregistrées.
 * Une séance effectuée = toutes les séries d'une même séance (modèle) sur une même journée.
 * Triée de la plus récente à la plus ancienne.
 */
export function buildWorkoutHistory(setLogs: SetLog[]): CompletedSeance[] {
  const groups = new Map<string, SetLog[]>();

  for (const log of setLogs) {
    const key = `${log.seanceId}|${getSetLogDateKey(log)}`;
    const group = groups.get(key);
    if (group) {
      group.push(log);
    } else {
      groups.set(key, [log]);
    }
  }

  const history: CompletedSeance[] = [];

  for (const logs of groups.values()) {
    const sorted = [...logs].sort((a, b) => toTime(a.date) - toTime(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Exercices dans l'ordre de leur première série
    const exercisesById = new Map<string, CompletedExercise>();
    for (const log of sorted) {
      let exercise = exercisesById.get(log.exerciseId);
      if (!exercise) {
        exercise = {
          id: `${log.exerciseId}-${getSetLogDateKey(log)}`,
          exerciseId: log.exerciseId,
          name: log.exerciseName,
          sets: [],
        };
        exercisesById.set(log.exerciseId, exercise);
      }
      exercise.sets.push({
        id: log.id,
        reps: log.reps,
        weightKg: log.weightKg,
        performedAt: log.date,
        intensity: log.intensity,
        bodyweight: log.bodyweight,
      });
    }

    const dateKey = getSetLogDateKey(first);
    history.push({
      id: `${first.seanceId}-${dateKey}`,
      programId: first.programId,
      seanceId: first.seanceId,
      // Les noms les plus récents font foi
      programName: last.programName,
      seanceName: last.seanceName,
      dateKey,
      startedAt: first.date,
      endedAt: last.date,
      durationMinutes: Math.max(0, Math.round((toTime(last.date) - toTime(first.date)) / 60000)),
      exercises: [...exercisesById.values()],
      totalReps: sorted.reduce((sum, log) => sum + log.reps, 0),
      totalVolumeKg: sorted.reduce((sum, log) => sum + setVolume(log), 0),
    });
  }

  return history.sort((a, b) => toTime(b.endedAt) - toTime(a.endedAt));
}
