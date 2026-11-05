export type SetIntensity = 'faible' | 'modere' | 'intense';

/**
 * Une série réellement effectuée.
 *
 * Les séries sont stockées à part des programmes : un programme, une séance ou un
 * exercice n'est qu'un modèle. Supprimer un modèle ne supprime donc pas l'historique.
 */
export interface SetLog {
  id: string;
  programId: string;
  seanceId: string;
  exerciseId: string;
  // Noms recopiés à l'enregistrement : l'historique reste lisible même si le modèle
  // est supprimé. Ils sont mis à jour quand on renomme le modèle.
  programName: string;
  seanceName: string;
  exerciseName: string;
  reps: number;
  weightKg: number;
  date: string; // ISO date string, date d'exécution de la série
  intensity?: SetIntensity;
  // true quand la charge est le poids de corps (pdc) : weightKg = charge ajoutée éventuelle
  bodyweight?: boolean;
}

/** Champs saisis par l'utilisateur ; le reste est complété par le store. */
export type NewSetLog = Pick<SetLog, 'id' | 'reps' | 'weightKg' | 'date' | 'intensity' | 'bodyweight'>;

export type SetLogChanges = Partial<Pick<SetLog, 'reps' | 'weightKg' | 'date' | 'intensity' | 'bodyweight'>>;

export interface ExerciseDefinition {
  name: string;
  subtitle?: string;
  imageUri?: string;
  notes?: string;
}

export interface Exercise extends ExerciseDefinition {
  id: string;
}

export interface Seance {
  id: string;
  name: string;
  subtitle?: string;
  imageUri?: string;
  date: string; // ISO date string
  exercises: Exercise[];
  durationMinutes?: number;
  // Notes libres (200 caractères max) par date de séance, clé = YYYY-MM-DD
  notesByDate?: Record<string, string>;
}

export interface Program {
  id: string;
  name: string;
  subtitle?: string;
  imageUri?: string;
  seances: Seance[];
}

// --- Vue « historique » : calculée à partir des SetLog (voir utils/workoutHistory.ts) ---

export interface CompletedSet {
  id: string;
  reps: number;
  weightKg: number;
  performedAt: string; // ISO date string
  intensity?: SetIntensity;
  bodyweight?: boolean;
}

export interface CompletedExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: CompletedSet[];
}

/** Une séance effectuée = toutes les séries d'une même séance (modèle) sur une même journée. */
export interface CompletedSeance {
  id: string;
  programId: string;
  seanceId: string;
  programName: string;
  seanceName: string;
  dateKey: string; // YYYY-MM-DD (heure locale)
  startedAt: string; // ISO date string (première série)
  endedAt: string; // ISO date string (dernière série)
  durationMinutes: number;
  exercises: CompletedExercise[];
  totalReps: number;
  totalVolumeKg: number;
}

/** Format enregistré dans AsyncStorage (v2 : séries séparées des programmes). */
export interface WorkoutStorageSchema {
  schemaVersion: 2;
  programs: Program[];
  setLogs: SetLog[];
}
