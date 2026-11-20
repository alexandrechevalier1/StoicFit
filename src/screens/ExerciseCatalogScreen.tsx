import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, SectionList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useProgramStore } from '../store/programStore';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, SCREEN_PADDING, spacing, typography } from '../theme/tokens';
import { pluralize } from '../utils/confirm';
import { Button, EmptyState, IconButton, ScreenHeader } from '../components/ui';
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
      });
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Ajouter des exercices" onBack={() => navigation.goBack()} />

      <View style={styles.searchBlock}>
        <View style={[styles.searchField, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.subtleText} />
          <TextInput
            style={[typography.body, styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher ou créer un exercice"
            placeholderTextColor={colors.subtleText}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <IconButton icon="close-circle" label="Effacer la recherche" tone="neutral" size={28} onPress={() => setQuery('')} />
          ) : null}
        </View>

        {trimmedQuery.length > 0 && !exactMatchExists ? (
          <Pressable
            onPress={handleCreateCustom}
            accessibilityRole="button"
            style={({ pressed }) => [styles.createRow, { backgroundColor: colors.primarySoft }, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={[typography.bodyStrong, styles.flex, { color: colors.primary }]} numberOfLines={1}>
              Créer « {trimmedQuery} »
            </Text>
          </Pressable>
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled
        renderSectionHeader={({ section: { title } }) => (
          <Text
            style={[
              typography.captionStrong,
              styles.sectionHeader,
              { color: colors.subtleText, backgroundColor: colors.background },
            ]}
          >
            {title}
          </Text>
        )}
        renderItem={({ item, index, section }) => {
          const isSelected = selected.includes(item);
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          return (
            <Pressable
              onPress={() => toggleSelect(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: colors.card },
                isFirst && styles.itemFirst,
                isLast && styles.itemLast,
                !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[typography.body, styles.flex, { color: colors.text }]}>{item}</Text>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={isSelected ? colors.primary : colors.border}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Aucun exercice trouvé"
            message="Utilisez « Créer » pour ajouter votre propre exercice."
          />
        }
      />

      {selected.length > 0 ? (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            label={`Ajouter ${pluralize(selected.length, 'exercice')}`}
            icon="checkmark"
            onPress={handleConfirm}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  searchBlock: { paddingHorizontal: SCREEN_PADDING, gap: spacing.sm, marginBottom: spacing.sm },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  listContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xl },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  itemFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  itemLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
