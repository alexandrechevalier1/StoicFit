import { useEffect } from 'react';
import { useProgramStore } from '../store/programStore';

/** Lance le chargement des séances au démarrage et expose son état. */
export function useWorkoutStorage() {
  const initialize = useProgramStore((state) => state.initialize);
  const isLoading = useProgramStore((state) => state.isLoading);
  const hasHydrated = useProgramStore((state) => state.hasHydrated);
  const error = useProgramStore((state) => state.error);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return { isLoading, hasHydrated, error };
}
