import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import SeancesScreen from '../screens/SeancesScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ExerciseCatalogScreen from '../screens/ExerciseCatalogScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useThemeStore } from '../store/themeStore';
import { DARK_COLORS, LIGHT_COLORS } from '../theme/colors';

export type RootTabParamList = {
  Seances: undefined;
  Nutrition: undefined;
  Profil: undefined;
};

export type SeancesStackParamList = {
  ProgramsList: undefined;
  SeancesList: { programId: string };
  ExerciseDetail: { programId: string; seanceId: string; exerciseId: string };
  ExercisesList: { programId: string; seanceId: string };
  ExerciseCatalog: { programId: string; seanceId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const SeancesStack = createNativeStackNavigator<SeancesStackParamList>();

function SeancesStackNavigator() {
  return (
    <SeancesStack.Navigator screenOptions={{ headerShown: false }}>
      <SeancesStack.Screen name="ProgramsList" component={WorkoutsScreen} />
      <SeancesStack.Screen name="SeancesList" component={SeancesScreen} />
      <SeancesStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <SeancesStack.Screen name="ExercisesList" component={ExercisesScreen} />
      <SeancesStack.Screen name="ExerciseCatalog" component={ExerciseCatalogScreen} />
    </SeancesStack.Navigator>
  );
}

export default function RootNavigator() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.subtleText,
        }}
      >
        <Tab.Screen
          name="Seances"
          component={SeancesStackNavigator}
          options={{ title: 'Séances' }}
        />
        <Tab.Screen
          name="Nutrition"
          component={NutritionScreen}
          options={{ title: 'Nutrition' }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileScreen}
          options={{ title: 'Profil' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
