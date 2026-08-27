export interface Meal {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionEntry {
  id: string;
  date: string; // ISO date string
  meals: Meal[];
}
