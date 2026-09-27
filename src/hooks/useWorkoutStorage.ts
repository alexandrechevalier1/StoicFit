import { useEffect } from 'react';
import { useProgramStore } from '../store/programStore';

export function useWorkoutStorage() {
  const initialize = useProgramStore((state) => state.initialize);
  const isLoading = useProgramStore((state) => state.isLoading);
  const hasHydrated = useProgramStore((state) => state.hasHydrated);
  const error = useProgramStore((state) => state.error);
  const programs = useProgramStore((state) => state.programs);
  const history = useProgramStore((state) => state.history);

  const addProgram = useProgramStore((state) => state.addProgram);
  const removeProgram = useProgramStore((state) => state.removeProgram);
  const updateProgram = useProgramStore((state) => state.updateProgram);
  const addSeance = useProgramStore((state) => state.addSeance);
  const removeSeance = useProgramStore((state) => state.removeSeance);
  const updateSeance = useProgramStore((state) => state.updateSeance);
  const addExercise = useProgramStore((state) => state.addExercise);
  const removeExercise = useProgramStore((state) => state.removeExercise);
  const updateExercise = useProgramStore((state) => state.updateExercise);
  const addSet = useProgramStore((state) => state.addSet);
  const removeSet = useProgramStore((state) => state.removeSet);
  const updateSet = useProgramStore((state) => state.updateSet);
  const completeSeance = useProgramStore((state) => state.completeSeance);
  const removeHistoryEntry = useProgramStore((state) => state.removeHistoryEntry);
  const updateHistoryEntry = useProgramStore((state) => state.updateHistoryEntry);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return {
    isLoading,
    hasHydrated,
    error,
    programs,
    history,
    addProgram,
    removeProgram,
    updateProgram,
    addSeance,
    removeSeance,
    updateSeance,
    addExercise,
    removeExercise,
    updateExercise,
    addSet,
    removeSet,
    updateSet,
    completeSeance,
    removeHistoryEntry,
    updateHistoryEntry,
  };
}
