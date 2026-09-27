import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MealSlot } from '../models';
import { useNutritionStorage } from '../hooks/useNutritionStorage';
import ProfileOnboardingSheet from '../components/ProfileOnboardingSheet';
import NutritionDailyView from '../components/NutritionDailyView';
import NutritionWeeklySummary from '../components/NutritionWeeklySummary';
import { useProfileStore } from '../store/profileStore';
import { useThemeColors } from '../theme/useThemeColors';
import { calculateNutritionTargets } from '../utils/nutritionCalculator';
import { addDaysToDateKey, getLocalDateKey } from '../utils/nutritionDate';
import { buildEmptyLog, DEFAULT_NUTRITION_GOALS } from '../utils/nutritionSummary';
import type { NutritionGoals } from '../models';

const EMPTY_FOOD_FORM = {
  name: '',
  quantity: '1',
  unit: 'g',
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
};

const EMPTY_GOAL_FORM = {
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  waterMl: '',
};

const isDefaultGoals = (goals: NutritionGoals) =>
  goals.calories === DEFAULT_NUTRITION_GOALS.calories &&
  goals.proteinG === DEFAULT_NUTRITION_GOALS.proteinG &&
  goals.carbsG === DEFAULT_NUTRITION_GOALS.carbsG &&
  goals.fatG === DEFAULT_NUTRITION_GOALS.fatG &&
  goals.waterMl === DEFAULT_NUTRITION_GOALS.waterMl;

export default function NutritionScreen() {
  const {
    goals,
    logsByDate,
    getDailyLog,
    setGoals,
    addFoodItem,
    removeFoodItem,
    addWater,
    resetDay,
    getDailyTotals,
    getWeeklySummary,
  } = useNutritionStorage();
  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const colors = useThemeColors();
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(!profile);
  const [selectedDateKey, setSelectedDateKey] = useState(getLocalDateKey());
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [activeMealSlot, setActiveMealSlot] = useState<MealSlot>('breakfast');
  const [foodForm, setFoodForm] = useState(EMPTY_FOOD_FORM);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);

  useEffect(() => {
    if (profile && isDefaultGoals(goals)) {
      setGoals(calculateNutritionTargets(profile));
    }
  }, [goals, profile, setGoals]);

  const selectedLog = useMemo(() => {
    return getDailyLog(selectedDateKey) ?? buildEmptyLog(selectedDateKey, goals);
  }, [getDailyLog, goals, selectedDateKey, logsByDate]);

  const totals = useMemo(() => getDailyTotals(selectedDateKey), [getDailyTotals, selectedDateKey, logsByDate]);
  const weeklySummary = useMemo(() => getWeeklySummary(selectedDateKey), [getWeeklySummary, selectedDateKey, logsByDate, goals]);

  const openAddFood = (mealSlot: MealSlot) => {
    setActiveMealSlot(mealSlot);
    setFoodForm(EMPTY_FOOD_FORM);
    setFoodModalVisible(true);
  };

  const closeFoodModal = () => {
    setFoodModalVisible(false);
    setFoodForm(EMPTY_FOOD_FORM);
  };

  const handleValidateFood = () => {
    if (!foodForm.name.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le nom de l’aliment.');
      return;
    }

    addFoodItem(selectedDateKey, activeMealSlot, {
      name: foodForm.name.trim(),
      quantity: Number(foodForm.quantity) > 0 ? Number(foodForm.quantity) : 1,
      unit: foodForm.unit.trim() || 'g',
      calories: Number(foodForm.calories) || 0,
      proteinG: Number(foodForm.proteinG) || 0,
      carbsG: Number(foodForm.carbsG) || 0,
      fatG: Number(foodForm.fatG) || 0,
    });

    closeFoodModal();
  };

  const openGoalsModal = () => {
    setGoalForm({
      calories: String(goals.calories),
      proteinG: String(goals.proteinG),
      carbsG: String(goals.carbsG),
      fatG: String(goals.fatG),
      waterMl: String(goals.waterMl),
    });
    setGoalsModalVisible(true);
  };

  const closeGoalsModal = () => {
    setGoalsModalVisible(false);
    setGoalForm(EMPTY_GOAL_FORM);
  };

  const handleValidateGoals = () => {
    const nextGoals: NutritionGoals = {
      calories: Number(goalForm.calories) || DEFAULT_NUTRITION_GOALS.calories,
      proteinG: Number(goalForm.proteinG) || DEFAULT_NUTRITION_GOALS.proteinG,
      carbsG: Number(goalForm.carbsG) || DEFAULT_NUTRITION_GOALS.carbsG,
      fatG: Number(goalForm.fatG) || DEFAULT_NUTRITION_GOALS.fatG,
      waterMl: Number(goalForm.waterMl) || DEFAULT_NUTRITION_GOALS.waterMl,
    };

    setGoals(nextGoals);
    closeGoalsModal();
  };

  const navigateDay = (offset: number) => {
    setSelectedDateKey((current) => addDaysToDateKey(current, offset));
  };

  const handleAddWater = (amountMl: number) => {
    addWater(selectedDateKey, amountMl);
  };

  const handleResetDay = () => {
    resetDay(selectedDateKey);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>Nutrition</Text>
        <Pressable onPress={handleResetDay} hitSlop={12}>
          <Text style={[styles.resetText, { color: colors.danger }]}>Réinitialiser le jour</Text>
        </Pressable>
      </View>

      <NutritionDailyView
        dateKey={selectedDateKey}
        log={selectedLog}
        goals={goals}
        totals={totals}
        onPreviousDay={() => navigateDay(-1)}
        onNextDay={() => navigateDay(1)}
        onToday={() => setSelectedDateKey(getLocalDateKey())}
        onAddFood={openAddFood}
        onRemoveFood={(slot, foodId) => removeFoodItem(selectedDateKey, slot, foodId)}
        onOpenGoals={openGoalsModal}
        onAddWater={handleAddWater}
      />

      <NutritionWeeklySummary summary={weeklySummary} />

      <ProfileOnboardingSheet
        visible={isOnboardingVisible}
        onRequestClose={() => setIsOnboardingVisible(false)}
        onComplete={(newProfile) => {
          setProfile(newProfile);
          if (isDefaultGoals(goals)) {
            setGoals(calculateNutritionTargets(newProfile));
          }
          setIsOnboardingVisible(false);
        }}
      />

      <Modal
        visible={foodModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeFoodModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeFoodModal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Pressable onPress={closeFoodModal} hitSlop={12}>
                <Text style={[styles.modalCloseButton, { color: colors.text }]}>{'✕'}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter un aliment</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.slotRow}>
                {([
                  ['breakfast', 'Petit-déj'],
                  ['lunch', 'Déjeuner'],
                  ['dinner', 'Dîner'],
                  ['snack', 'Snack'],
                ] as Array<[MealSlot, string]>).map(([slot, label]) => (
                  <Pressable
                    key={slot}
                    style={[
                      styles.slotChip,
                      { borderColor: colors.border },
                      activeMealSlot === slot && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setActiveMealSlot(slot)}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        { color: colors.subtleText },
                        activeMealSlot === slot && styles.slotChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Field label="Nom" value={foodForm.name} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, name: text }))} placeholder="Ex: Poulet grillé" />
              <Field label="Quantité" value={foodForm.quantity} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, quantity: text }))} placeholder="1" keyboardType="numeric" />
              <Field label="Unité" value={foodForm.unit} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, unit: text }))} placeholder="g" />
              <Field label="Calories" value={foodForm.calories} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, calories: text }))} placeholder="0" keyboardType="numeric" />
              <Field label="Protéines" value={foodForm.proteinG} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, proteinG: text }))} placeholder="0" keyboardType="numeric" />
              <Field label="Glucides" value={foodForm.carbsG} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, carbsG: text }))} placeholder="0" keyboardType="numeric" />
              <Field label="Lipides" value={foodForm.fatG} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, fatG: text }))} placeholder="0" keyboardType="numeric" />

              <Pressable style={[styles.modalValidateButton, { backgroundColor: colors.primary }]} onPress={handleValidateFood}>
                <Text style={styles.modalValidateButtonText}>Ajouter au journal</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={goalsModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeGoalsModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeGoalsModal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Pressable onPress={closeGoalsModal} hitSlop={12}>
                <Text style={[styles.modalCloseButton, { color: colors.text }]}>{'✕'}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Objectifs nutritionnels</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <Field label="Calories" value={goalForm.calories} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, calories: text }))} placeholder="2000" keyboardType="numeric" />
              <Field label="Protéines" value={goalForm.proteinG} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, proteinG: text }))} placeholder="140" keyboardType="numeric" />
              <Field label="Glucides" value={goalForm.carbsG} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, carbsG: text }))} placeholder="220" keyboardType="numeric" />
              <Field label="Lipides" value={goalForm.fatG} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, fatG: text }))} placeholder="70" keyboardType="numeric" />
              <Field label="Eau (ml)" value={goalForm.waterMl} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, waterMl: text }))} placeholder="2500" keyboardType="numeric" />

              <Pressable style={[styles.modalValidateButton, { backgroundColor: colors.primary }]} onPress={handleValidateGoals}>
                <Text style={styles.modalValidateButtonText}>Enregistrer les objectifs</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.subtleText }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtleText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 36,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  resetText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
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
  modalCloseButton: { fontSize: 20, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalHeaderSpacer: { width: 20 },
  modalScrollContent: { paddingBottom: 24 },
  slotRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  slotChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slotChipText: { fontSize: 12, fontWeight: '600' },
  slotChipTextActive: { color: '#fff' },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalValidateButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  modalValidateButtonText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
