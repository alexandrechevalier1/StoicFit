import { useEffect } from 'react';
import { useNutritionStore } from '../store/nutritionStore';
import { useThemeStore } from '../store/themeStore';
import { getLocalDateKey } from '../utils/nutritionDate';
import { updateNutritionWidgets } from './widgetBridge';
import { buildWidgetData } from './widgetData';

const DEBOUNCE_MS = 400;

/**
 * Tient les widgets à jour pendant que l'app est ouverte : chaque ajout d'aliment,
 * verre d'eau, changement d'objectif ou de thème redessine les widgets.
 */
export function useNutritionWidgetSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const push = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const { logsByDate, goals } = useNutritionStore.getState();
        const data = buildWidgetData(logsByDate[getLocalDateKey()], goals, useThemeStore.getState().isDarkMode);
        void updateNutritionWidgets(data);
      }, DEBOUNCE_MS);
    };

    push();
    const unsubscribeNutrition = useNutritionStore.subscribe(push);
    const unsubscribeTheme = useThemeStore.subscribe(push);
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribeNutrition();
      unsubscribeTheme();
    };
  }, [enabled]);
}
