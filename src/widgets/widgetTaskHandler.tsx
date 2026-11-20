import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderNutritionWidget } from './NutritionWidgets';
import { loadWidgetData } from './widgetData';

/**
 * Appelé par Android (même app fermée) quand un widget est ajouté, redimensionné,
 * ou à la mise à jour périodique (toutes les 30 min, ce qui gère aussi le passage à minuit).
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK': {
      const data = await loadWidgetData();
      renderWidget(renderNutritionWidget(widgetInfo.widgetName, data, widgetInfo.width, widgetInfo.height));
      break;
    }
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
