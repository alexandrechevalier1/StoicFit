import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyNutritionLog, NutritionGoals } from '../models';
import { computeNutritionTotals, DEFAULT_NUTRITION_GOALS } from '../utils/nutritionSummary';
import { getLocalDateKey } from '../utils/nutritionDate';

// Mêmes clés que src/store/nutritionStore.ts et src/store/themeStore.ts.
const GOALS_STORAGE_KEY = '@stoicfit/nutrition/goals';
const LOG_STORAGE_PREFIX = '@stoicfit/nutrition/logs/';
const THEME_STORAGE_KEY = '@stoicfit/theme';

/** Tout ce qu'un widget affiche, déjà calculé. */
export type NutritionWidgetData = {
  calories: number;
  caloriesGoal: number;
  proteinG: number;
  proteinGoal: number;
  carbsG: number;
  carbsGoal: number;
  fatG: number;
  fatGoal: number;
  waterMl: number;
  waterGoal: number;
  isDark: boolean;
};

export function buildWidgetData(
  log: DailyNutritionLog | undefined,
  fallbackGoals: NutritionGoals,
  isDark: boolean
): NutritionWidgetData {
  const totals = computeNutritionTotals(log);
  const goals = log?.goals ?? fallbackGoals;
  return {
    calories: totals.calories,
    caloriesGoal: goals.calories,
    proteinG: totals.proteinG,
    proteinGoal: goals.proteinG,
    carbsG: totals.carbsG,
    carbsGoal: goals.carbsG,
    fatG: totals.fatG,
    fatGoal: goals.fatG,
    waterMl: totals.waterMl,
    waterGoal: goals.waterMl,
    isDark,
  };
}

const parseJson = <T>(raw: string | null): T | undefined => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
};

/**
 * Lecture directe du stockage, utilisée quand Android redessine le widget
 * alors que l'application est fermée (ajout, redimensionnement, mise à jour périodique).
 */
export async function loadWidgetData(): Promise<NutritionWidgetData> {
  const [[, goalsRaw], [, logRaw], [, themeRaw]] = await AsyncStorage.multiGet([
    GOALS_STORAGE_KEY,
    `${LOG_STORAGE_PREFIX}${getLocalDateKey()}`,
    THEME_STORAGE_KEY,
  ]);

  const goals = parseJson<NutritionGoals>(goalsRaw) ?? DEFAULT_NUTRITION_GOALS;
  const log = parseJson<DailyNutritionLog>(logRaw);
  const theme = parseJson<{ state?: { isDarkMode?: boolean } }>(themeRaw);

  return buildWidgetData(log, goals, theme?.state?.isDarkMode ?? false);
}
