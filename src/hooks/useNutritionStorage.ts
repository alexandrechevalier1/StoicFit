import { useEffect } from 'react';
import { useNutritionStore } from '../store/nutritionStore';

export function useNutritionStorage() {
  const initialize = useNutritionStore((state) => state.initialize);
  const isLoading = useNutritionStore((state) => state.isLoading);
  const hasHydrated = useNutritionStore((state) => state.hasHydrated);
  const error = useNutritionStore((state) => state.error);
  const goals = useNutritionStore((state) => state.goals);
  const logsByDate = useNutritionStore((state) => state.logsByDate);
  const getDailyLog = useNutritionStore((state) => state.getDailyLog);
  const ensureDailyLog = useNutritionStore((state) => state.ensureDailyLog);
  const upsertDailyLog = useNutritionStore((state) => state.upsertDailyLog);
  const setGoals = useNutritionStore((state) => state.setGoals);
  const addFoodItem = useNutritionStore((state) => state.addFoodItem);
  const removeFoodItem = useNutritionStore((state) => state.removeFoodItem);
  const updateFoodItem = useNutritionStore((state) => state.updateFoodItem);
  const addWater = useNutritionStore((state) => state.addWater);
  const resetDay = useNutritionStore((state) => state.resetDay);
  const getDailyTotals = useNutritionStore((state) => state.getDailyTotals);
  const getWeeklySummary = useNutritionStore((state) => state.getWeeklySummary);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return {
    isLoading,
    hasHydrated,
    error,
    goals,
    logsByDate,
    getDailyLog,
    ensureDailyLog,
    upsertDailyLog,
    setGoals,
    addFoodItem,
    removeFoodItem,
    updateFoodItem,
    addWater,
    resetDay,
    getDailyTotals,
    getWeeklySummary,
  };
}
