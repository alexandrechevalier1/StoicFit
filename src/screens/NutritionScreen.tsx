import { StyleSheet, Text, View, Button, FlatList } from 'react-native';
import { useNutritionStore } from '../store/nutritionStore';

export default function NutritionScreen() {
  const entries = useNutritionStore((state) => state.entries);
  const addEntry = useNutritionStore((state) => state.addEntry);

  const handleAddMeal = () => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = entries.find((e) => e.date === today);
    if (existing) {
      return;
    }
    addEntry({
      id: Date.now().toString(),
      date: today,
      meals: [
        {
          id: Date.now().toString(),
          name: 'Nouveau repas',
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nutrition</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>Aucune entrée pour le moment.</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              {item.date} — {item.meals.length} repas
            </Text>
          )}
        />
      )}
      <Button title="Ajouter un repas" onPress={handleAddMeal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  empty: { color: '#888', marginBottom: 16 },
  item: { fontSize: 16, paddingVertical: 8 },
});
