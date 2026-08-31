import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, SectionList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { useThemeColors } from '../theme/useThemeColors';
import type { SeancesStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<SeancesStackParamList, 'ExerciseCatalog'>;

const CUSTOM_CATEGORY = 'Mes exercices';

export default function ExerciseCatalogScreen({ route, navigation }: Props) {
  const { programId, seanceId } = route.params;
  const addExercise = useProgramStore((state) => state.addExercise);
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [customExercises, setCustomExercises] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const allExercises = useMemo(
    () => [
      ...customExercises.map((name) => ({ name, category: CUSTOM_CATEGORY })),
      ...EXERCISE_CATALOG,
    ],
    [customExercises]
  );

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const exactMatchExists = allExercises.some(
    (ex) => ex.name.toLowerCase() === normalizedQuery
  );

  const sections = useMemo(() => {
    const filtered = allExercises.filter((ex) =>
      ex.name.toLowerCase().includes(normalizedQuery)
    );

    const byCategory = new Map<string, string[]>();
    for (const ex of filtered) {
      const list = byCategory.get(ex.category) ?? [];
      list.push(ex.name);
      byCategory.set(ex.category, list);
    }

    return Array.from(byCategory.entries()).map(([title, data]) => ({ title, data }));
  }, [allExercises, normalizedQuery]);

  const toggleSelect = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleCreateCustom = () => {
    if (!trimmedQuery || exactMatchExists) return;
    setCustomExercises((prev) => [...prev, trimmedQuery]);
    setSelected((prev) => [...prev, trimmedQuery]);
  };

  const handleConfirm = () => {
    selected.forEach((name, index) => {
      addExercise(programId, seanceId, {
        id: `${Date.now()}-${index}`,
        name,
        sets: [],
      });
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>{'‹ Retour'}</Text>
        </Pressable>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Catalogue d'exercices</Text>

      <TextInput
        style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher ou créer un exercice..."
        placeholderTextColor={colors.subtleText}
        clearButtonMode="while-editing"
      />

      {trimmedQuery.length > 0 && !exactMatchExists && (
        <Pressable style={[styles.createRow, { backgroundColor: colors.card }]} onPress={handleCreateCustom}>
          <Text style={[styles.createRowText, { color: colors.primary }]}>+ Créer "{trimmedQuery}"</Text>
        </Pressable>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionHeader, { color: colors.subtleText, backgroundColor: colors.background }]}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item);
          return (
            <Pressable style={[styles.item, { borderBottomColor: colors.border }]} onPress={() => toggleSelect(item)}>
              <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.subtleText }]}>Aucun exercice trouvé.</Text>}
        stickySectionHeadersEnabled
      />

      {selected.length > 0 && (
        <Pressable style={[styles.confirmButton, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>
            Ajouter {selected.length} exercice{selected.length > 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  headerRow: { marginBottom: 8 },
  backButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  createRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    marginBottom: 8,
  },
  createRowText: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    backgroundColor: '#fff',
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemText: { fontSize: 16, flex: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkboxMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  empty: { color: '#888', marginTop: 16 },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
