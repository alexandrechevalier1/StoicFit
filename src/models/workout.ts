export interface Set {
  id: string;
  reps: number;
  weightKg: number;
  completed: boolean;
  date: string; // ISO date string, date à laquelle la série a été enregistrée
}

export interface Exercise {
  id: string;
  name: string;
  subtitle?: string;
  imageUri?: string;
  sets: Set[];
  notes?: string;
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
