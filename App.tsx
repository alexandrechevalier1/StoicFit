import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { useNutritionStorage } from './src/hooks/useNutritionStorage';
import { useWorkoutStorage } from './src/hooks/useWorkoutStorage';
import { useThemeStore } from './src/store/themeStore';

export default function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const workoutStorage = useWorkoutStorage();
  const nutritionStorage = useNutritionStorage();

  const isLoading = workoutStorage.isLoading || nutritionStorage.isLoading;
  const error = workoutStorage.error ?? nutritionStorage.error;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Chargement des donnees locales...</Text>
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      {error ? (
        <View style={styles.errorBanner} pointerEvents="none">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  errorBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 40,
    backgroundColor: 'rgba(176, 0, 32, 0.92)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
