import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type {
  DailyNutritionLog,
  FoodItem,
  Meal,
  MealSlot,
  NutritionGoals,
  NutritionTotals,
  WeeklyNutritionSummary,
} from '../models';
import {
  buildEmptyLog,
  computeNutritionTotals,
  DEFAULT_NUTRITION_GOALS,
  summarizeWeeklyNutrition,
} from '../utils/nutritionSummary';
import { getLocalDateKey } from '../utils/nutritionDate';

const GOALS_STORAGE_KEY = '@stoicfit/nutrition/goals';
const LOG_STORAGE_PREFIX = '@stoicfit/nutrition/logs/';
// Hors du préfixe des logs : les copies de secours ne sont jamais rechargées comme des journées.
const BACKUP_KEY_PREFIX = '@stoicfit/backup/';

type NutritionLogMap = Record<string, DailyNutritionLog>;

type FoodItemInput = Omit<FoodItem, 'id' | 'createdAt'> & { id?: string };

interface NutritionStore {
  logsByDate: NutritionLogMap;
  goals: NutritionGoals;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  getDailyLog: (dateKey: string) => DailyNutritionLog | undefined;
  ensureDailyLog: (dateKey: string) => DailyNutritionLog;
  upsertDailyLog: (dateKey: string, changes: Partial<DailyNutritionLog>) => void;
  setGoals: (goals: NutritionGoals) => void;
  addFoodItem: (dateKey: string, mealSlot: MealSlot, item: FoodItemInput) => void;
  removeFoodItem: (dateKey: string, mealSlot: MealSlot, foodId: string) => void;
  updateFoodItem: (
    dateKey: string,
    mealSlot: MealSlot,
    foodId: string,
    changes: Partial<FoodItem>
  ) => void;
  addWater: (dateKey: string, amountMl: number) => void;
  resetDay: (dateKey: string) => void;
  getDailyTotals: (dateKey: string) => NutritionTotals;
  getWeeklySummary: (referenceDateKey?: string) => WeeklyNutritionSummary;
}

const buildMealTemplate = (dateKey: string): Meal[] => [
  { id: `${dateKey}-breakfast`, slot: 'breakfast', label: 'Petit-déjeuner', items: [] },
  { id: `${dateKey}-lunch`, slot: 'lunch', label: 'Déjeuner', items: [] },
  { id: `${dateKey}-dinner`, slot: 'dinner', label: 'Dîner', items: [] },
  { id: `${dateKey}-snack`, slot: 'snack', label: 'Snacks', items: [] },
];

const normalizeLog = (log: DailyNutritionLog): DailyNutritionLog => ({
  ...log,
  meals:
    log.meals.length > 0
      ? log.meals
      : buildMealTemplate(log.dateKey),
});

// Passe à true si la lecture initiale a échoué : on bloque alors toute écriture
// pour ne pas écraser des données encore récupérables.
let isPersistenceBlocked = false;

const canPersist = () => !isPersistenceBlocked && useNutritionStore.getState().hasHydrated;

const backupRawValue = async (storageKey: string, rawValue: string) => {
  const backupKey = `${BACKUP_KEY_PREFIX}${storageKey}/${new Date().toISOString()}`;
  await AsyncStorage.setItem(backupKey, rawValue);
};

const persistLog = async (log: DailyNutritionLog) => {
  if (!canPersist()) {
    return;
  }
  await AsyncStorage.setItem(`${LOG_STORAGE_PREFIX}${log.dateKey}`, JSON.stringify(log));
};

const persistGoals = async (goals: NutritionGoals) => {
  if (!canPersist()) {
    return;
  }
  await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
};

const getMealLabel = (slot: MealSlot): string => {
  switch (slot) {
    case 'breakfast':
      return 'Petit-déjeuner';
    case 'lunch':
      return 'Déjeuner';
    case 'dinner':
      return 'Dîner';
    case 'snack':
      return 'Snacks';
  }
};

const upsertMeal = (log: DailyNutritionLog, slot: MealSlot, updater: (meal: Meal) => Meal): DailyNutritionLog => {
  const meals = log.meals.length > 0 ? [...log.meals] : buildMealTemplate(log.dateKey);
  const mealIndex = meals.findIndex((meal) => meal.slot === slot);
  const meal = mealIndex >= 0 ? meals[mealIndex] : { id: `${log.dateKey}-${slot}`, slot, label: getMealLabel(slot), items: [] };
  const updatedMeal = updater(meal);

  if (mealIndex >= 0) {
    meals[mealIndex] = updatedMeal;
  } else {
    meals.push(updatedMeal);
  }

  return {
    ...log,
    meals,
    updatedAt: new Date().toISOString(),
  };
};

export const useNutritionStore = create<NutritionStore>((set, get) => {
  const saveLog = async (dateKey: string) => {
    const log = get().logsByDate[dateKey];
    if (!log) {
      return;
    }

    try {
      await persistLog(log);
      if (get().error) {
        set({ error: null });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown storage error';
      set({ error: `Echec de sauvegarde nutrition: ${message}` });
    }
  };

  const updateLog = (dateKey: string, updater: (log: DailyNutritionLog) => DailyNutritionLog) => {
    set((state) => {
      const currentLog = state.logsByDate[dateKey] ?? buildEmptyLog(dateKey, state.goals);
      const nextLog = updater(normalizeLog(currentLog));
      return {
        logsByDate: {
          ...state.logsByDate,
          [dateKey]: nextLog,
        },
      };
    });

    void saveLog(dateKey);
  };

  return {
    logsByDate: {},
    goals: DEFAULT_NUTRITION_GOALS,
    isLoading: false,
    hasHydrated: false,
    error: null,

    initialize: async () => {
      const state = get();
      if (state.isLoading || state.hasHydrated) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const [goalsRaw, allKeys] = await Promise.all([
          AsyncStorage.getItem(GOALS_STORAGE_KEY),
          AsyncStorage.getAllKeys(),
        ]);

        let storedGoals = DEFAULT_NUTRITION_GOALS;
        if (goalsRaw) {
          try {
            const parsedGoals: unknown = JSON.parse(goalsRaw);
            if (
              typeof parsedGoals === 'object' &&
              parsedGoals !== null &&
              'calories' in parsedGoals &&
              'proteinG' in parsedGoals &&
              'carbsG' in parsedGoals &&
              'fatG' in parsedGoals &&
              'waterMl' in parsedGoals
            ) {
              storedGoals = parsedGoals as NutritionGoals;
            }
          } catch {
            storedGoals = DEFAULT_NUTRITION_GOALS;
            try {
              await backupRawValue(GOALS_STORAGE_KEY, goalsRaw);
            } catch {
              // Les objectifs se recalculent depuis le profil : pas bloquant.
            }
          }
        }

        const logKeys = allKeys.filter((key) => key.startsWith(LOG_STORAGE_PREFIX));
        const entries = await AsyncStorage.multiGet(logKeys);
        const logsByDate: NutritionLogMap = {};

        for (const [storageKey, rawValue] of entries) {
          if (!storageKey || !rawValue) {
            continue;
          }

          const dateKey = storageKey.slice(LOG_STORAGE_PREFIX.length);
          try {
            const parsedLog: unknown = JSON.parse(rawValue);
            if (
              typeof parsedLog === 'object' &&
              parsedLog !== null &&
              'dateKey' in parsedLog &&
              'meals' in parsedLog &&
              'waterMl' in parsedLog
            ) {
              const log = normalizeLog(parsedLog as DailyNutritionLog);
              logsByDate[dateKey] = {
                ...log,
                goals: parsedGoalsHaveValue(log.goals) ? log.goals : storedGoals,
              };
            }
          } catch {
            // Journée illisible : on la met de côté (copie brute) avant de la retirer.
            // Si la copie échoue, on laisse l'original en place.
            try {
              await backupRawValue(storageKey, rawValue);
              await AsyncStorage.removeItem(storageKey);
            } catch {
              // On réessaiera au prochain démarrage.
            }
          }
        }

        set({
          goals: storedGoals,
          logsByDate,
          hasHydrated: true,
          isLoading: false,
          error: null,
        });
      } catch (error: unknown) {
        // Erreur de lecture d'AsyncStorage : les données sont peut-être intactes,
        // on ne doit pas les écraser avec un état vide.
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        isPersistenceBlocked = true;
        set({
          logsByDate: {},
          goals: DEFAULT_NUTRITION_GOALS,
          hasHydrated: true,
          isLoading: false,
          error: `Impossible de lire tes données nutrition (${message}). Sauvegarde désactivée pour ne rien écraser : redémarre l'application.`,
        });
      }
    },

    getDailyLog: (dateKey) => get().logsByDate[dateKey],

    ensureDailyLog: (dateKey) => {
      const state = get();
      const existing = state.logsByDate[dateKey];
      if (existing) {
        return existing;
      }

      const log = buildEmptyLog(dateKey, state.goals);
      set((current) => ({
        logsByDate: {
          ...current.logsByDate,
          [dateKey]: log,
        },
      }));
      void persistLog(log);
      return log;
    },

    upsertDailyLog: (dateKey, changes) => {
      updateLog(dateKey, (log) => ({
        ...log,
        ...changes,
        meals: changes.meals ?? log.meals,
        goals: changes.goals ?? log.goals,
      }));
    },

    setGoals: (goals) => {
      set((state) => ({
        goals,
        logsByDate: Object.fromEntries(
          Object.entries(state.logsByDate).map(([dateKey, log]) => [
            dateKey,
            { ...log, goals, updatedAt: new Date().toISOString() },
          ])
        ),
      }));

      void persistGoals(goals);
      void Promise.all(
        Object.values(get().logsByDate).map(async (log) => {
          await persistLog({ ...log, goals, updatedAt: new Date().toISOString() });
        })
      );
    },

    addFoodItem: (dateKey, mealSlot, item) => {
      const itemId = item.id ?? `${dateKey}-${mealSlot}-${Date.now()}`;
      updateLog(dateKey, (log) =>
        upsertMeal(log, mealSlot, (meal) => ({
          ...meal,
          items: [
            ...meal.items,
            {
              id: itemId,
              name: item.name,
              calories: item.calories,
              proteinG: item.proteinG,
              carbsG: item.carbsG,
              fatG: item.fatG,
              quantity: item.quantity,
              unit: item.unit,
              createdAt: new Date().toISOString(),
            },
          ],
        }))
      );
    },

    removeFoodItem: (dateKey, mealSlot, foodId) => {
      updateLog(dateKey, (log) =>
        upsertMeal(log, mealSlot, (meal) => ({
          ...meal,
          items: meal.items.filter((item) => item.id !== foodId),
        }))
      );
    },

    updateFoodItem: (dateKey, mealSlot, foodId, changes) => {
      updateLog(dateKey, (log) =>
        upsertMeal(log, mealSlot, (meal) => ({
          ...meal,
          items: meal.items.map((item) => (item.id === foodId ? { ...item, ...changes } : item)),
        }))
      );
    },

    addWater: (dateKey, amountMl) => {
      updateLog(dateKey, (log) => ({
        ...log,
        waterMl: Math.max(0, log.waterMl + amountMl),
      }));
    },

    resetDay: (dateKey) => {
      const log = buildEmptyLog(dateKey, get().goals);
      set((state) => ({
        logsByDate: {
          ...state.logsByDate,
          [dateKey]: log,
        },
      }));
      void persistLog(log);
    },

    getDailyTotals: (dateKey) => computeNutritionTotals(get().logsByDate[dateKey]),

    getWeeklySummary: (referenceDateKey = getLocalDateKey()) =>
      summarizeWeeklyNutrition(get().logsByDate, referenceDateKey, get().goals),
  };
});

function parsedGoalsHaveValue(goals: NutritionGoals): boolean {
  return (
    Number.isFinite(goals.calories) &&
    Number.isFinite(goals.proteinG) &&
    Number.isFinite(goals.carbsG) &&
    Number.isFinite(goals.fatG) &&
    Number.isFinite(goals.waterMl)
  );
}
