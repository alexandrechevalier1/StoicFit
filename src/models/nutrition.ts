export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  quantity: number;
  unit: string;
  createdAt: string;
}

export interface Meal {
  id: string;
  slot: MealSlot;
  label: string;
  items: FoodItem[];
}

export interface NutritionGoals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export interface DailyNutritionLog {
  dateKey: string; // YYYY-MM-DD in local time
  meals: Meal[];
  waterMl: number;
  goals: NutritionGoals;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  itemsCount: number;
}

export interface NutritionDaySummary {
  dateKey: string;
  totals: NutritionTotals;
  goals: NutritionGoals;
  calorieDelta: number;
  isCaloriesGoalMet: boolean;
  macroStatus: {
    proteinMet: boolean;
    carbsMet: boolean;
    fatMet: boolean;
  };
}

export interface WeeklyNutritionSummary {
  startDateKey: string;
  endDateKey: string;
  days: NutritionDaySummary[];
  averages: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
  };
  totals: NutritionTotals;
}
