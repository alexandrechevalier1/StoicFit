import { useMemo } from 'react';
import { useProgramStore } from '../store/programStore';
import { buildWorkoutHistory } from '../utils/workoutHistory';

/** Historique des séances effectuées, recalculé uniquement quand les séries changent. */
export function useWorkoutHistory() {
  const setLogs = useProgramStore((state) => state.setLogs);
  return useMemo(() => buildWorkoutHistory(setLogs), [setLogs]);
}
