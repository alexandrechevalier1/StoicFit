import { registerRootComponent } from 'expo';

import App from './App';
import { registerNutritionWidgets } from './src/widgets/widgetBridge';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Widgets Android de l'écran d'accueil (sans effet dans Expo Go).
registerNutritionWidgets();
