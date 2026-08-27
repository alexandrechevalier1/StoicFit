import { create } from 'zustand';
import type { Program, Seance, Exercise, Set } from '../models';

interface ProgramStore {
  programs: Program[];
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
}

export const useProgramStore = create<ProgramStore>((set) => ({
  programs: [],

  addProgram: (program) =>
    set((state) => ({ programs: [...state.programs, program] })),

  removeProgram: (programId) =>
    set((state) => ({
      programs: state.programs.filter((p) => p.id !== programId),
    })),

  updateProgram: (programId, changes) =>
    set((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId ? { ...p, ...changes } : p
      ),
    })),

  addSeance: (programId, seance) =>
    set((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId ? { ...p, seances: [...p.seances, seance] } : p
      ),
    })),

  removeSeance: (programId, seanceId) =>
    set((state) => ({
      programs: state.programs.map((p) =>
        p.id === programId
          ? { ...p, seances: p.seances.filter((s) => s.id !== seanceId) }
          : p
      ),
    })),

  updateSeance: (programId, seanceId, changes) =>
    set((state) => ({
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
    set((state) => ({
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
    set((state) => ({
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
    set((state) => ({
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
    set((state) => ({
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
    set((state) => ({
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
}));
