export interface ExercisePerformanceLog {
  id: string;
  reps: number;
  weightKg: number;
  completed: boolean;
  date: string; // ISO date string, date d'execution de la performance
}

export interface Set extends ExercisePerformanceLog {}

export interface ExerciseDefinition {
  name: string;
  subtitle?: string;
  imageUri?: string;
  notes?: string;
}

export interface Exercise extends ExerciseDefinition {
  id: string;
  sets: ExercisePerformanceLog[];
}

export interface Seance {
  id: string;
  name: string;
  subtitle?: string;
  imageUri?: string;
  date: string; // ISO date string
  exercises: Exercise[];
  durationMinutes?: number;
}

export interface Program {
  id: string;
  name: string;
  subtitle?: string;
  imageUri?: string;
  seances: Seance[];
}

export interface CompletedSet {
  id: string;
  setId?: string;
  reps: number;
  weightKg: number;
  completed: boolean;
  performedAt: string; // ISO date string
}

export interface CompletedExercise {
  id: string;
  exerciseId: string;
  name: string;
  subtitle?: string;
  notes?: string;
  sets: CompletedSet[];
}

export interface CompletedSeance {
  id: string;
  programId: string;
  seanceId: string;
  programName: string;
  seanceName: string;
  startedAt: string; // ISO date string
  endedAt: string; // ISO date string
  durationMinutes: number;
  exercises: CompletedExercise[];
  totalReps: number;
  totalVolumeKg: number;
}

export interface WorkoutStorageSchema {
  schemaVersion: number;
  programs: Program[];
  history: CompletedSeance[];
}
