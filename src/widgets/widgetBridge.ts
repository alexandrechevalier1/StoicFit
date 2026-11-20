import { Platform, TurboModuleRegistry } from 'react-native';
import type { NutritionWidgetData } from './widgetData';

/**
 * Le module natif des widgets n'existe que dans un vrai build Android
 * (APK / build de développement), pas dans Expo Go. La librairie plante dès
 * son import si le module manque : on ne la charge donc qu'après vérification.
 */
const isWidgetModuleAvailable = Platform.OS === 'android' && TurboModuleRegistry.get('AndroidWidget') != null;

type WidgetLib = typeof import('react-native-android-widget');
type WidgetViews = typeof import('./NutritionWidgets');

export function registerNutritionWidgets() {
  if (!isWidgetModuleAvailable) return;
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as WidgetLib;
  const { widgetTaskHandler } = require('./widgetTaskHandler') as typeof import('./widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

/** Redessine tous les widgets posés sur l'écran d'accueil avec les données fournies. */
export async function updateNutritionWidgets(data: NutritionWidgetData) {
  if (!isWidgetModuleAvailable) return;
  const { requestWidgetUpdate } = require('react-native-android-widget') as WidgetLib;
  const { WIDGET_NAMES, renderNutritionWidget } = require('./NutritionWidgets') as WidgetViews;

  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: (info) => renderNutritionWidget(info.widgetName, data, info.width, info.height),
      }).catch(() => {
        // Un widget qui ne se met pas à jour ne doit jamais casser l'app.
      })
    )
  );
}
