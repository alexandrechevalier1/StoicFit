import { create } from 'zustand';
import type { NutritionEntry, Meal } from '../models';

interface NutritionStore {
  entries: NutritionEntry[];
  addEntry: (entry: NutritionEntry) => void;
  removeEntry: (entryId: string) => void;
  addMeal: (entryId: string, meal: Meal) => void;
  removeMeal: (entryId: string, mealId: string) => void;
  addWater: (entryId: string, amountMl: number) => void;
  getEntryByDate: (date: string) => NutritionEntry | undefined;
}

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => ({ entries: [...state.entries, entry] })),

  removeEntry: (entryId) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== entryId),
    })),

  addMeal: (entryId, meal) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, meals: [...e.meals, meal] } : e
      ),
    })),

  removeMeal: (entryId, mealId) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId
          ? { ...e, meals: e.meals.filter((m) => m.id !== mealId) }
          : e
      ),
    })),

  addWater: (entryId, amountMl) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, waterMl: e.waterMl + amountMl } : e
      ),
    })),

  getEntryByDate: (date) => get().entries.find((e) => e.date === date),
}));
