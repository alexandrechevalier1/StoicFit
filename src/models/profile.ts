export type Sex = 'homme' | 'femme';
export type NutritionGoal = 'perte' | 'maintien' | 'prise';
export type DailyActivityLevel = 'sedentaire' | 'leger' | 'actif' | 'tres_actif';
export type TrainingIntensity = 'faible' | 'modere' | 'eleve';

export interface UserProfile {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number;
  goal: NutritionGoal;
  targetWeightKg: number;
  dailyActivityLevel: DailyActivityLevel;
  trainingFrequencyPerWeek: number;
  trainingIntensity: TrainingIntensity;
}
