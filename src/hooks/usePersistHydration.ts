import { useEffect, useState } from 'react';

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (listener: () => void) => () => void;
};

/**
 * Retourne true une fois que le store persisté (middleware `persist` de Zustand)
 * a fini de relire ses données depuis AsyncStorage.
 */
export function usePersistHydration(persistApi: PersistApi) {
  const [hydrated, setHydrated] = useState(() => persistApi.hasHydrated());

  useEffect(() => {
    const unsubscribe = persistApi.onFinishHydration(() => setHydrated(true));
    // L'hydratation a pu se terminer entre le premier rendu et l'abonnement.
    if (persistApi.hasHydrated()) {
      setHydrated(true);
    }
    return unsubscribe;
  }, [persistApi]);

  return hydrated;
}
