import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Program,
  Seance,
  Exercise,
  Set,
  CompletedExercise,
  CompletedSeance,
  WorkoutStorageSchema,
} from '../models';

const STORAGE_KEY = '@stoicfit/workout-storage';
const SCHEMA_VERSION = 1;

type MutableWorkoutData = {
  programs: Program[];
  history: CompletedSeance[];
};

const DEFAULT_DATA: MutableWorkoutData = {
  programs: [],
  history: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parsePersistedPayload = (raw: string): MutableWorkoutData => {
  const parsedUnknown: unknown = JSON.parse(raw);

  if (!isRecord(parsedUnknown)) {
    throw new Error('Persisted payload is not an object');
  }

  const parsed = parsedUnknown as Partial<WorkoutStorageSchema>;

  if (!Array.isArray(parsed.programs)) {
    throw new Error('Persisted programs are invalid');
  }

  if (parsed.history !== undefined && !Array.isArray(parsed.history)) {
    throw new Error('Persisted history is invalid');
  }

  return {
    programs: parsed.programs,
    history: parsed.history ?? [],
  };
};

const computeHistoryStats = (exercises: CompletedExercise[]) => {
  const totalReps = exercises.reduce(
    (sum, exercise) => sum + exercise.sets.reduce((setSum, setItem) => setSum + setItem.reps, 0),
    0
  );

  const totalVolumeKg = exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (setSum, setItem) => setSum + setItem.reps * setItem.weightKg,
        0
      ),
    0
  );

  return {
    totalReps,
    totalVolumeKg,
  };
};

export interface ProgramStore {
  programs: Program[];
  history: CompletedSeance[];

  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  initialize: () => Promise<void>;

  // Program / seance CRUD
  addProgram: (program: Program) => void;
  removeProgram: (programId: string) => void;
  updateProgram: (programId: string, changes: Partial<Program>) => void;
  addSeance: (programId: string, seance: Seance) => void;
  removeSeance: (programId: string, seanceId: string) => void;
  updateSeance: (programId: string, seanceId: string, changes: Partial<Seance>) => void;
  addExercise: (programId: string, seanceId: string, exercise: Exercise) => void;
  removeExercise: (programId: string, seanceId: string, exerciseId: string) => void;
  updateExercise: (
    programId: string,
    seanceId: string,
    exerciseId: string,
    changes: Partial<Exercise>
  ) => void;
  addSet: (programId: string, seanceId: string, exerciseId: string, set: Set) => void;
  removeSet: (programId: string, seanceId: string, exerciseId: string, setId: string) => void;
  updateSet: (
    programId: string,
    seanceId: string,
    exerciseId: string,
    setId: string,
    changes: Partial<Set>
  ) => void;

  // Completed seance history CRUD
  completeSeance: (programId: string, seanceId: string) => boolean;
  removeHistoryEntry: (historyId: string) => void;
  updateHistoryEntry: (historyId: string, changes: Partial<CompletedSeance>) => void;
}

export const useProgramStore = create<ProgramStore>((set, get) => {
  const persist = async () => {
    const snapshot: WorkoutStorageSchema = {
      schemaVersion: SCHEMA_VERSION,
      programs: get().programs,
      history: get().history,
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      if (get().error) {
        set({ error: null });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown storage error';
      set({ error: `Echec de sauvegarde locale: ${message}` });
    }
  };

  const updateAndPersist = (updater: (state: ProgramStore) => Partial<ProgramStore>) => {
    set((state) => updater(state));
    void persist();
  };

  return {
    isLoading: false,
    hasHydrated: false,
    error: null,
    programs: [],
    history: [],

    initialize: async () => {
      const state = get();
      if (state.isLoading || state.hasHydrated) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);

        if (!raw) {
          set({ ...DEFAULT_DATA, hasHydrated: true, isLoading: false });
          return;
        }

        const parsed = parsePersistedPayload(raw);
        set({
          programs: parsed.programs,
          history: parsed.history,
          hasHydrated: true,
          isLoading: false,
          error: null,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown parse error';

        set({
          ...DEFAULT_DATA,
          hasHydrated: true,
          isLoading: false,
          error: `Donnees locales invalides. Reset applique: ${message}`,
        });

        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch {
          // Keep the state usable even if cleanup fails.
        }
      }
    },

  addProgram: (program) =>
    updateAndPersist((state) => ({ programs: [...state.programs, program] })),

  removeProgram: (programId) =>
    updateAndPersist((state) => ({
      programs: state.programs.filter((p) => p.id !== programId),
    })),

  updateProgram: (programId, changes) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId ? { ...p, ...changes } : p
      ),
    })),

  addSeance: (programId, seance) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId ? { ...p, seances: [...p.seances, seance] } : p
      ),
    })),

  removeSeance: (programId, seanceId) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? { ...p, seances: p.seances.filter((s) => s.id !== seanceId) }
          : p
      ),
    })),

  updateSeance: (programId, seanceId, changes) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? {
              ...p,
              seances: p.seances.map((s) =>
                s.id === seanceId ? { ...s, ...changes } : s
              ),
            }
          : p
      ),
    })),

  addExercise: (programId, seanceId, exercise) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? {
              ...p,
              seances: p.seances.map((s) =>
                s.id === seanceId
                  ? { ...s, exercises: [...s.exercises, exercise] }
                  : s
              ),
            }
          : p
      ),
    })),

  removeExercise: (programId, seanceId, exerciseId) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? {
              ...p,
              seances: p.seances.map((s) =>
                s.id === seanceId
                  ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
                  : s
              ),
            }
          : p
      ),
    })),

  updateExercise: (programId, seanceId, exerciseId, changes) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? {
              ...p,
              seances: p.seances.map((s) =>
                s.id === seanceId
                  ? {
                      ...s,
                      exercises: s.exercises.map((e) =>
                        e.id === exerciseId ? { ...e, ...changes } : e
                      ),
                    }
                  : s
              ),
            }
          : p
      ),
    })),

  addSet: (programId, seanceId, exerciseId, newSet) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? {
              ...p,
              seances: p.seances.map((s) =>
                s.id === seanceId
                  ? {
                      ...s,
                      exercises: s.exercises.map((e) =>
                        e.id === exerciseId
                          ? { ...e, sets: [...e.sets, newSet] }
                          : e
                      ),
                    }
                  : s
              ),
            }
          : p
      ),
    })),

  removeSet: (programId, seanceId, exerciseId, setId) =>
    updateAndPersist((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? {
              ...p,
              seances: p.seances.map((s) =>
                s.id === seanceId
                  ? {
                      ...s,
                      exercises: s.exercises.map((e) =>
                        e.id === exerciseId
                          ? { ...e, sets: e.sets.filter((set) => set.id !== setId) }
                          : e
                      ),
                    }
                  : s
              ),
            }
          : p
      ),
    })),

    updateSet: (programId, seanceId, exerciseId, setId, changes) =>
      updateAndPersist((state) => ({
        programs: state.programs.map((p) =>
          p.id === programId
            ? {
                ...p,
                seances: p.seances.map((s) =>
                  s.id === seanceId
                    ? {
                        ...s,
                        exercises: s.exercises.map((e) =>
                          e.id === exerciseId
                            ? {
                                ...e,
                                sets: e.sets.map((setItem) =>
                                  setItem.id === setId
                                    ? { ...setItem, ...changes }
                                    : setItem
                                ),
                              }
                            : e
                        ),
                      }
                    : s
                ),
              }
            : p
        ),
      })),

    completeSeance: (programId, seanceId) => {
      const program = get().programs.find((item) => item.id === programId);
      const seance = program?.seances.find((item) => item.id === seanceId);

      if (!program || !seance) {
        return false;
      }

      const nowIso = new Date().toISOString();

      const completedExercises: CompletedExercise[] = seance.exercises.map((exercise) => ({
        id: `${exercise.id}-${nowIso}`,
        exerciseId: exercise.id,
        name: exercise.name,
        subtitle: exercise.subtitle,
        notes: exercise.notes,
        sets: exercise.sets.map((setItem) => ({
          id: `${setItem.id}-${nowIso}`,
          setId: setItem.id,
          reps: setItem.reps,
          weightKg: setItem.weightKg,
          completed: setItem.completed,
          performedAt: setItem.date,
        })),
      }));

      const setDates = completedExercises
        .flatMap((exercise) => exercise.sets)
        .map((setItem) => new Date(setItem.performedAt).getTime())
        .filter((timestamp) => Number.isFinite(timestamp));

      const earliest = setDates.length > 0 ? Math.min(...setDates) : new Date(seance.date).getTime();
      const startedAt = Number.isFinite(earliest) ? new Date(earliest).toISOString() : nowIso;
      const endedAt = nowIso;

      const durationMinutes = Math.max(
        0,
        Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
      );

      const stats = computeHistoryStats(completedExercises);

      const historyEntry: CompletedSeance = {
        id: `history-${seance.id}-${nowIso}`,
        programId: program.id,
        seanceId: seance.id,
        programName: program.name,
        seanceName: seance.name,
        startedAt,
        endedAt,
        durationMinutes,
        exercises: completedExercises,
        totalReps: stats.totalReps,
        totalVolumeKg: stats.totalVolumeKg,
      };

      updateAndPersist((state) => ({ history: [historyEntry, ...state.history] }));
      return true;
    },

    removeHistoryEntry: (historyId) =>
      updateAndPersist((state) => ({
        history: state.history.filter((entry) => entry.id !== historyId),
      })),

    updateHistoryEntry: (historyId, changes) =>
      updateAndPersist((state) => ({
        history: state.history.map((entry) =>
          entry.id === historyId ? { ...entry, ...changes } : entry
        ),
      })),
  };
});
