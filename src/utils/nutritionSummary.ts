import type {
  DailyNutritionLog,
  NutritionDaySummary,
  NutritionGoals,
  NutritionTotals,
  WeeklyNutritionSummary,
} from '../models';
import { addDaysToDateKey, getWeekRange } from './nutritionDate';

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  calories: 2000,
  proteinG: 140,
  carbsG: 220,
  fatG: 70,
  waterMl: 2500,
};

export function buildEmptyLog(dateKey: string, goals: NutritionGoals = DEFAULT_NUTRITION_GOALS): DailyNutritionLog {
  const nowIso = new Date().toISOString();

  return {
    dateKey,
    meals: [
      { id: `${dateKey}-breakfast`, slot: 'breakfast', label: 'Petit-déjeuner', items: [] },
      { id: `${dateKey}-lunch`, slot: 'lunch', label: 'Déjeuner', items: [] },
      { id: `${dateKey}-dinner`, slot: 'dinner', label: 'Dîner', items: [] },
      { id: `${dateKey}-snack`, slot: 'snack', label: 'Snacks', items: [] },
    ],
    waterMl: 0,
    goals,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function computeNutritionTotals(log?: DailyNutritionLog): NutritionTotals {
  if (!log) {
    return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, waterMl: 0, itemsCount: 0 };
  }

  const items = log.meals.flatMap((meal) => meal.items);

  return {
    calories: items.reduce((sum, item) => sum + item.calories, 0),
    proteinG: items.reduce((sum, item) => sum + item.proteinG, 0),
    carbsG: items.reduce((sum, item) => sum + item.carbsG, 0),
    fatG: items.reduce((sum, item) => sum + item.fatG, 0),
    waterMl: log.waterMl,
    itemsCount: items.length,
  };
}

export function summarizeDay(
  dateKey: string,
  log?: DailyNutritionLog,
  goals: NutritionGoals = DEFAULT_NUTRITION_GOALS
): NutritionDaySummary {
  const totals = computeNutritionTotals(log);
  const activeGoals = log?.goals ?? goals;

  return {
    dateKey,
    totals,
    goals: activeGoals,
    calorieDelta: totals.calories - activeGoals.calories,
    isCaloriesGoalMet: totals.calories <= activeGoals.calories,
    macroStatus: {
      proteinMet: totals.proteinG >= activeGoals.proteinG,
      carbsMet: totals.carbsG <= activeGoals.carbsG,
      fatMet: totals.fatG <= activeGoals.fatG,
    },
  };
}

export function summarizeWeeklyNutrition(
  logsByDate: Record<string, DailyNutritionLog>,
  referenceDateKey: string,
  goals: NutritionGoals = DEFAULT_NUTRITION_GOALS
): WeeklyNutritionSummary {
  const range = getWeekRange(referenceDateKey);
  const days = range.map((dateKey) => summarizeDay(dateKey, logsByDate[dateKey], goals));
  const totals = days.reduce<NutritionTotals>(
    (acc, day) => ({
      calories: acc.calories + day.totals.calories,
      proteinG: acc.proteinG + day.totals.proteinG,
      carbsG: acc.carbsG + day.totals.carbsG,
      fatG: acc.fatG + day.totals.fatG,
      waterMl: acc.waterMl + day.totals.waterMl,
      itemsCount: acc.itemsCount + day.totals.itemsCount,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, waterMl: 0, itemsCount: 0 }
  );

  const dayCount = days.length || 1;

  return {
    startDateKey: range[0],
    endDateKey: range[range.length - 1],
    days,
    totals,
    averages: {
      calories: Math.round(totals.calories / dayCount),
      proteinG: Math.round(totals.proteinG / dayCount),
      carbsG: Math.round(totals.carbsG / dayCount),
      fatG: Math.round(totals.fatG / dayCount),
      waterMl: Math.round(totals.waterMl / dayCount),
    },
  };
}

export function getOrCreateMealLabels() {
  return {
    breakfast: 'Petit-déjeuner',
    lunch: 'Déjeuner',
    dinner: 'Dîner',
    snack: 'Snacks',
  } as Record<'breakfast' | 'lunch' | 'dinner' | 'snack', string>;
}

export function addDays(dateKey: string, offsetDays: number) {
  return addDaysToDateKey(dateKey, offsetDays);
}