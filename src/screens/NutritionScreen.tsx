import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, ScrollView, FlatList } from 'react-native';
import { useNutritionStore } from '../store/nutritionStore';
import { useProfileStore } from '../store/profileStore';
import ProfileOnboardingSheet from '../components/ProfileOnboardingSheet';
import CalorieProgressCard from '../components/CalorieProgressCard';
import NumericKeypad from '../components/NumericKeypad';
import { useThemeColors } from '../theme/useThemeColors';
import { calculateNutritionTargets } from '../utils/nutritionCalculator';

type MealField = 'calories' | 'carbsG' | 'fatG' | 'proteinG';

const WATER_QUICK_ADD_ML = [250, 500];

export default function NutritionScreen() {
  const entries = useNutritionStore((state) => state.entries);
  const addEntry = useNutritionStore((state) => state.addEntry);
  const addMeal = useNutritionStore((state) => state.addMeal);
  const addWater = useNutritionStore((state) => state.addWater);
  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const colors = useThemeColors();
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(!profile);
  const [isAddMealModalVisible, setIsAddMealModalVisible] = useState(false);
  const [activeField, setActiveField] = useState<MealField>('calories');
  const [mealValues, setMealValues] = useState<Record<MealField, string>>({
    calories: '',
    carbsG: '',
    fatG: '',
    proteinG: '',
  });

  const targets = profile ? calculateNutritionTargets(profile) : null;

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((e) => e.date === today);
  const consumed = (todayEntry?.meals ?? []).reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      proteinG: acc.proteinG + meal.proteinG,
      carbsG: acc.carbsG + meal.carbsG,
      fatG: acc.fatG + meal.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  const consumedWaterMl = todayEntry?.waterMl ?? 0;

  const ensureTodayEntry = (): string => {
    const existing = entries.find((e) => e.date === today);
    if (existing) return existing.id;
    const id = Date.now().toString();
    addEntry({ id, date: today, meals: [], waterMl: 0 });
    return id;
  };

  const closeAddMealModal = () => {
    setIsAddMealModalVisible(false);
    setActiveField('calories');
    setMealValues({ calories: '', carbsG: '', fatG: '', proteinG: '' });
  };

  const handleValidateMeal = () => {
    const entryId = ensureTodayEntry();
    addMeal(entryId, {
      id: Date.now().toString(),
      name: 'Repas',
      calories: Number(mealValues.calories) || 0,
      carbsG: Number(mealValues.carbsG) || 0,
      fatG: Number(mealValues.fatG) || 0,
      proteinG: Number(mealValues.proteinG) || 0,
    });
    closeAddMealModal();
  };

  const handleAddWater = (amountMl: number) => {
    const entryId = ensureTodayEntry();
    addWater(entryId, amountMl);
  };

  const fieldTabs: { key: MealField; label: string; unit: string }[] = [
    { key: 'calories', label: 'Calories', unit: 'kcal' },
    { key: 'carbsG', label: 'Glucides', unit: 'g' },
    { key: 'fatG', label: 'Lipides', unit: 'g' },
    { key: 'proteinG', label: 'Protéines', unit: 'g' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>Nutrition</Text>
        <Pressable
          onPress={() => setIsAddMealModalVisible(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          hitSlop={12}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {targets && (
        <>
          <CalorieProgressCard
            consumedCalories={consumed.calories}
            targetCalories={targets.calories}
          />

          <View style={styles.macrosRow}>
            <View style={[styles.macroCard, { borderColor: colors.border }]}>
              <Text style={[styles.macroTitle, { color: '#B37FE0' }]}>Glucides</Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {consumed.carbsG}
                <Text style={[styles.macroUnit, { color: colors.subtleText }]}> g</Text>
              </Text>
              <Text style={[styles.macroTarget, { color: colors.subtleText }]}>/ {targets.carbsG} g</Text>
            </View>
            <View style={[styles.macroCard, { borderColor: colors.border }]}>
              <Text style={[styles.macroTitle, { color: colors.danger }]}>Lipides</Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {consumed.fatG}
                <Text style={[styles.macroUnit, { color: colors.subtleText }]}> g</Text>
              </Text>
              <Text style={[styles.macroTarget, { color: colors.subtleText }]}>/ {targets.fatG} g</Text>
            </View>
            <View style={[styles.macroCard, { borderColor: colors.border }]}>
              <Text style={[styles.macroTitle, { color: '#D9A441' }]}>Protéines</Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {consumed.proteinG}
                <Text style={[styles.macroUnit, { color: colors.subtleText }]}> g</Text>
              </Text>
              <Text style={[styles.macroTarget, { color: colors.subtleText }]}>/ {targets.proteinG} g</Text>
            </View>
          </View>

          <View style={[styles.waterCard, { backgroundColor: colors.card }]}>
            <View style={styles.waterHeaderRow}>
              <Text style={[styles.waterTitle, { color: colors.text }]}>💧 Hydratation</Text>
              <Text style={[styles.waterValue, { color: colors.primary }]}>
                {(consumedWaterMl / 1000).toFixed(2)} / {(targets.waterMl / 1000).toFixed(1)} L
              </Text>
            </View>
            <View style={[styles.waterBarTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.waterBarFill,
                  { width: `${Math.min(100, (consumedWaterMl / targets.waterMl) * 100)}%` },
                ]}
              />
            </View>
            <View style={styles.waterQuickAddRow}>
              {WATER_QUICK_ADD_ML.map((amount) => (
                <Pressable
                  key={amount}
                  style={styles.waterQuickAddButton}
                  onPress={() => handleAddWater(amount)}
                >
                  <Text style={styles.waterQuickAddText}>+{amount} ml</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}

      {entries.length === 0 ? (
        <Text style={[styles.empty, { color: colors.subtleText }]}>Aucune entrée pour le moment.</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={[styles.item, { color: colors.text }]}>
              {item.date} — {item.meals.length} repas
            </Text>
          )}
        />
      )}

      <Modal
        visible={isAddMealModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeAddMealModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeAddMealModal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Pressable onPress={closeAddMealModal} hitSlop={12}>
                <Text style={[styles.modalCloseButton, { color: colors.text }]}>{'✕'}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau repas</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fieldTabsRow}>
                {fieldTabs.map((field) => (
                  <Pressable
                    key={field.key}
                    style={[
                      styles.fieldTab,
                      { borderColor: colors.border },
                      activeField === field.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setActiveField(field.key)}
                  >
                    <Text
                      style={[
                        styles.fieldTabLabel,
                        { color: colors.subtleText },
                        activeField === field.key && styles.fieldTabLabelActive,
                      ]}
                    >
                      {field.label}
                    </Text>
                    <Text
                      style={[
                        styles.fieldTabValue,
                        { color: colors.text },
                        activeField === field.key && styles.fieldTabLabelActive,
                      ]}
                    >
                      {mealValues[field.key] || '0'} {field.unit}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <NumericKeypad
                value={mealValues[activeField]}
                onDigitPress={(digit) =>
                  setMealValues((prev) => ({ ...prev, [activeField]: prev[activeField] + digit }))
                }
                onDeletePress={() =>
                  setMealValues((prev) => ({
                    ...prev,
                    [activeField]: prev[activeField].slice(0, -1),
                  }))
                }
              />

              <Pressable style={[styles.modalValidateButton, { backgroundColor: colors.primary }]} onPress={handleValidateMeal}>
                <Text style={styles.modalValidateButtonText}>Valider le repas</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ProfileOnboardingSheet
        visible={isOnboardingVisible}
        onRequestClose={() => setIsOnboardingVisible(false)}
        onComplete={(newProfile) => {
          setProfile(newProfile);
          setIsOnboardingVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  empty: { color: '#888', marginBottom: 16 },
  item: { fontSize: 16, paddingVertical: 8 },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  macroCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E1E6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  macroTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  macroValue: { fontSize: 18, fontWeight: 'bold' },
  macroUnit: { fontSize: 12, fontWeight: '400', color: '#888' },
  macroTarget: { fontSize: 11, color: '#888', marginTop: 2 },
  waterCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  waterTitle: { fontSize: 15, fontWeight: '600' },
  waterValue: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  waterBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E1E1E6',
    overflow: 'hidden',
  },
  waterBarFill: { height: '100%', borderRadius: 5, backgroundColor: '#5AC8FA' },
  waterQuickAddRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  waterQuickAddButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#5AC8FA',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  waterQuickAddText: { fontSize: 14, fontWeight: '600', color: '#5AC8FA' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalCloseButton: { fontSize: 20, color: '#000', fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalHeaderSpacer: { width: 20 },
  modalScrollContent: { paddingBottom: 24 },
  fieldTabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  fieldTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E1E6',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  fieldTabActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  fieldTabLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  fieldTabValue: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  fieldTabLabelActive: { color: '#fff' },
  modalValidateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalValidateButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});

