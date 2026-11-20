import { DarkTheme, DefaultTheme, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { IconName } from '../components/ui/IconButton';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import SeancesScreen from '../screens/SeancesScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ExerciseCatalogScreen from '../screens/ExerciseCatalogScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
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

export type ProfilStackParamList = {
  ProfileHome: undefined;
  Analytics: undefined;
};

const TAB_ICONS: Record<keyof RootTabParamList, { active: IconName; inactive: IconName }> = {
  Seances: { active: 'barbell', inactive: 'barbell-outline' },
  Nutrition: { active: 'nutrition', inactive: 'nutrition-outline' },
  Profil: { active: 'person', inactive: 'person-outline' },
};

// Liens profonds : stoicfit://nutrition ouvre l'onglet Nutrition (utilisé par les widgets).
const linking: LinkingOptions<RootTabParamList> = {
  prefixes: ['stoicfit://'],
  config: {
    screens: {
      Nutrition: 'nutrition',
    },
  },
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const SeancesStack = createNativeStackNavigator<SeancesStackParamList>();
const ProfilStack = createNativeStackNavigator<ProfilStackParamList>();

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

function ProfilStackNavigator() {
  return (
    <ProfilStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfilStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfilStack.Screen name="Analytics" component={AnalyticsScreen} />
    </ProfilStack.Navigator>
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
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.subtleText,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive}
              size={size}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen
          name="Seances"
          component={SeancesStackNavigator}
          options={{ title: 'Sport' }}
        />
        <Tab.Screen
          name="Nutrition"
          component={NutritionScreen}
          options={{ title: 'Nutrition' }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfilStackNavigator}
          options={{ title: 'Profil' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
