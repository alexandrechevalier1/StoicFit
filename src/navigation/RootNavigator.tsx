import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import SeancesScreen from '../screens/SeancesScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ProfileScreen from '../screens/ProfileScreen';

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
    </SeancesStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
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
