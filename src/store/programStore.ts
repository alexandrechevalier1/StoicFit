import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Program,
  Seance,
  Exercise,
  NewSetLog,
  SetLog,
  SetLogChanges,
  WorkoutStorageSchema,
} from '../models';
import {
  CURRENT_SCHEMA_VERSION,
  NewerSchemaError,
  parseWorkoutPayload,
  type WorkoutData,
} from './workoutMigrations';

const STORAGE_KEY = '@stoicfit/workout-storage';
const BACKUP_KEY_PREFIX = '@stoicfit/backup/workout-storage/';

const DEFAULT_DATA: WorkoutData = {
  programs: [],
  setLogs: [],
};

// --- Helpers de mise à jour imbriquée ---

const mapSeances = (
  programs: Program[],
  programId: string,
  update: (seances: Seance[]) => Seance[]
) => programs.map((p) => (p.id === programId ? { ...p, seances: update(p.seances) } : p));

const mapExercises = (
  programs: Program[],
  programId: string,
  seanceId: string,
  update: (exercises: Exercise[]) => Exercise[]
) =>
  mapSeances(programs, programId, (seances) =>
    seances.map((s) => (s.id === seanceId ? { ...s, exercises: update(s.exercises) } : s))
  );

/** Recopie un nouveau nom dans les séries déjà enregistrées. */
const renameInLogs = (
  setLogs: SetLog[],
  match: (log: SetLog) => boolean,
  field: 'programName' | 'seanceName' | 'exerciseName',
  name: string | undefined
) => {
  if (name === undefined) return setLogs;
  return setLogs.map((log) => (match(log) && log[field] !== name ? { ...log, [field]: name } : log));
};

export interface ProgramStore {
  /** Modèles : programmes → séances → exercices (sans aucune série). */
  programs: Program[];
  /** Séries réellement effectuées. Indépendantes des modèles. */
  setLogs: SetLog[];

  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  initialize: () => Promise<void>;

  // Modèles
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

  // Séries effectuées
  addSet: (programId: string, seanceId: string, exerciseId: string, set: NewSetLog) => void;
  updateSet: (setId: string, changes: SetLogChanges) => void;
  removeSet: (setId: string) => void;
}

export const useProgramStore = create<ProgramStore>((set, get) => {
  // Passe à true si on n'a pas pu lire (ou sauvegarder) les données existantes :
  // on bloque alors toute écriture pour ne pas écraser des données encore récupérables.
  let isPersistenceBlocked = false;

  const persist = async () => {
    if (!get().hasHydrated || isPersistenceBlocked) {
      return;
    }

    const snapshot: WorkoutStorageSchema = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      programs: get().programs,
      setLogs: get().setLogs,
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

  const backupRaw = async (label: string, raw: string) => {
    const backupKey = `${BACKUP_KEY_PREFIX}${label}${new Date().toISOString()}`;
    await AsyncStorage.setItem(backupKey, raw);
    return backupKey;
  };

  return {
    isLoading: false,
    hasHydrated: false,
    error: null,
    ...DEFAULT_DATA,

    initialize: async () => {
      const state = get();
      if (state.isLoading || state.hasHydrated) {
        return;
      }

      set({ isLoading: true, error: null });

      let raw: string | null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      } catch (error: unknown) {
        // Erreur de lecture (pas de corruption) : les données sont peut-être intactes,
        // on ne doit surtout pas les écraser avec un état vide.
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        isPersistenceBlocked = true;
        set({
          ...DEFAULT_DATA,
          hasHydrated: true,
          isLoading: false,
          error: `Impossible de lire tes séances (${message}). Sauvegarde désactivée pour ne rien écraser : redémarre l'application.`,
        });
        return;
      }

      if (!raw) {
        set({ ...DEFAULT_DATA, hasHydrated: true, isLoading: false });
        return;
      }

      let parsed: ReturnType<typeof parseWorkoutPayload>;
      try {
        parsed = parseWorkoutPayload(raw);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';

        if (error instanceof NewerSchemaError) {
          // Données d'une version plus récente : on ne sait pas les lire, on n'y touche pas.
          isPersistenceBlocked = true;
          set({
            ...DEFAULT_DATA,
            hasHydrated: true,
            isLoading: false,
            error: `${message}. Mets l'application à jour. Sauvegarde désactivée pour ne rien écraser.`,
          });
          return;
        }

        // Données corrompues : on garde une copie brute avant de repartir de zéro.
        let backupKey: string | null = null;
        try {
          backupKey = await backupRaw('', raw);
        } catch {
          // Sans copie de secours, on n'écrase pas l'original.
          isPersistenceBlocked = true;
        }

        set({
          ...DEFAULT_DATA,
          hasHydrated: true,
          isLoading: false,
          error: backupKey
            ? `Données de séances illisibles (${message}). Une copie a été conservée (${backupKey}).`
            : `Données de séances illisibles (${message}). Sauvegarde désactivée pour ne rien écraser.`,
        });
        return;
      }

      const needsMigration = parsed.storedVersion < CURRENT_SCHEMA_VERSION;
      let migrationError: string | null = null;

      if (needsMigration) {
        // Copie de l'ancien format avant de le réécrire, au cas où la migration aurait un bug.
        try {
          await backupRaw(`v${parsed.storedVersion}-`, raw);
        } catch (error: unknown) {
          isPersistenceBlocked = true;
          const message = error instanceof Error ? error.message : 'Erreur inconnue';
          migrationError = `Impossible de sauvegarder l'ancien format avant migration (${message}). Sauvegarde désactivée pour ne rien écraser.`;
        }
      }

      set({
        programs: parsed.programs,
        setLogs: parsed.setLogs,
        hasHydrated: true,
        isLoading: false,
        error: migrationError,
      });

      if (needsMigration) {
        await persist();
      }
    },

    // --- Modèles ---

    addProgram: (program) =>
      updateAndPersist((state) => ({ programs: [...state.programs, program] })),

    // Les séries enregistrées sont conservées : elles restent dans l'historique.
    removeProgram: (programId) =>
      updateAndPersist((state) => ({
        programs: state.programs.filter((p) => p.id !== programId),
      })),

    updateProgram: (programId, changes) =>
      updateAndPersist((state) => ({
        programs: state.programs.map((p) => (p.id === programId ? { ...p, ...changes } : p)),
        setLogs: renameInLogs(state.setLogs, (l) => l.programId === programId, 'programName', changes.name),
      })),

    addSeance: (programId, seance) =>
      updateAndPersist((state) => ({
        programs: mapSeances(state.programs, programId, (seances) => [...seances, seance]),
      })),

    removeSeance: (programId, seanceId) =>
      updateAndPersist((state) => ({
        programs: mapSeances(state.programs, programId, (seances) =>
          seances.filter((s) => s.id !== seanceId)
        ),
      })),

    updateSeance: (programId, seanceId, changes) =>
      updateAndPersist((state) => ({
        programs: mapSeances(state.programs, programId, (seances) =>
          seances.map((s) => (s.id === seanceId ? { ...s, ...changes } : s))
        ),
        setLogs: renameInLogs(state.setLogs, (l) => l.seanceId === seanceId, 'seanceName', changes.name),
      })),

    addExercise: (programId, seanceId, exercise) =>
      updateAndPersist((state) => ({
        programs: mapExercises(state.programs, programId, seanceId, (exercises) => [
          ...exercises,
          exercise,
        ]),
      })),

    removeExercise: (programId, seanceId, exerciseId) =>
      updateAndPersist((state) => ({
        programs: mapExercises(state.programs, programId, seanceId, (exercises) =>
          exercises.filter((e) => e.id !== exerciseId)
        ),
      })),

    updateExercise: (programId, seanceId, exerciseId, changes) =>
      updateAndPersist((state) => ({
        programs: mapExercises(state.programs, programId, seanceId, (exercises) =>
          exercises.map((e) => (e.id === exerciseId ? { ...e, ...changes } : e))
        ),
        setLogs: renameInLogs(state.setLogs, (l) => l.exerciseId === exerciseId, 'exerciseName', changes.name),
      })),

    // --- Séries effectuées ---

    addSet: (programId, seanceId, exerciseId, newSet) => {
      const program = get().programs.find((p) => p.id === programId);
      const seance = program?.seances.find((s) => s.id === seanceId);
      const exercise = seance?.exercises.find((e) => e.id === exerciseId);
      if (!program || !seance || !exercise) {
        return;
      }

      const log: SetLog = {
        ...newSet,
        programId,
        seanceId,
        exerciseId,
        programName: program.name,
        seanceName: seance.name,
        exerciseName: exercise.name,
      };

      updateAndPersist((state) => ({ setLogs: [...state.setLogs, log] }));
    },

    updateSet: (setId, changes) =>
      updateAndPersist((state) => ({
        setLogs: state.setLogs.map((log) => (log.id === setId ? { ...log, ...changes } : log)),
      })),

    removeSet: (setId) =>
      updateAndPersist((state) => ({
        setLogs: state.setLogs.filter((log) => log.id !== setId),
      })),
  };
});
