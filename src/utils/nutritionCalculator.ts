import type { UserProfile } from '../models';

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
}

const ACTIVITY_MULTIPLIERS: Record<UserProfile['dailyActivityLevel'], number> = {
  sedentaire: 1.2,
  leger: 1.375,
  actif: 1.55,
  tres_actif: 1.725,
};

const PROTEIN_PER_KG: Record<UserProfile['goal'], number> = {
  perte: 2.0,
  maintien: 1.8,
  prise: 1.8,
};

const CALORIE_ADJUSTMENT: Record<UserProfile['goal'], number> = {
  perte: -0.15,
  maintien: 0,
  prise: 0.15,
};

// Mifflin-St Jeor
function computeBmr(profile: UserProfile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === 'homme' ? base + 5 : base - 161;
}

export function calculateNutritionTargets(profile: UserProfile): NutritionTargets {
  const bmr = computeBmr(profile);
  const maintenanceCalories = bmr * ACTIVITY_MULTIPLIERS[profile.dailyActivityLevel];
  const calories = Math.round(maintenanceCalories * (1 + CALORIE_ADJUSTMENT[profile.goal]));

  const proteinG = Math.round(profile.weightKg * PROTEIN_PER_KG[profile.goal]);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  const waterMl = Math.round(
    profile.weightKg * 35 + (profile.trainingFrequencyPerWeek >= 4 ? 500 : 0)
  );

  return { calories, proteinG, fatG, carbsG, waterMl };
}
