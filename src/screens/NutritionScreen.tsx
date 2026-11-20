import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MealSlot } from '../models';
import { useNutritionStorage } from '../hooks/useNutritionStorage';
import ProfileOnboardingSheet from '../components/ProfileOnboardingSheet';
import NutritionDailyView from '../components/NutritionDailyView';
import NutritionWeeklySummary from '../components/NutritionWeeklySummary';
import { useProfileStore } from '../store/profileStore';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, SCREEN_PADDING, spacing, typography } from '../theme/tokens';
import { Button, ScreenHeader, Sheet } from '../components/ui';
import { calculateNutritionTargets } from '../utils/nutritionCalculator';
import { addDaysToDateKey, getLocalDateKey } from '../utils/nutritionDate';
import { buildEmptyLog, DEFAULT_NUTRITION_GOALS } from '../utils/nutritionSummary';
import { parseDecimal } from '../utils/number';
import { confirmDestructive, pluralize } from '../utils/confirm';
import type { NutritionGoals } from '../models';

/** Valeur saisie si c'est un nombre >= 0, sinon `fallback`. Accepte "12,5" comme "12.5". */
const parseAmount = (value: string, fallback: number) => {
  const parsed = parseDecimal(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/** Comme parseAmount, mais refuse 0 (utile pour les objectifs et la quantité). */
const parsePositiveAmount = (value: string, fallback: number) => {
  const parsed = parseAmount(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

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
      quantity: parsePositiveAmount(foodForm.quantity, 1),
      unit: foodForm.unit.trim() || 'g',
      calories: parseAmount(foodForm.calories, 0),
      proteinG: parseAmount(foodForm.proteinG, 0),
      carbsG: parseAmount(foodForm.carbsG, 0),
      fatG: parseAmount(foodForm.fatG, 0),
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
      calories: parsePositiveAmount(goalForm.calories, DEFAULT_NUTRITION_GOALS.calories),
      proteinG: parsePositiveAmount(goalForm.proteinG, DEFAULT_NUTRITION_GOALS.proteinG),
      carbsG: parsePositiveAmount(goalForm.carbsG, DEFAULT_NUTRITION_GOALS.carbsG),
      fatG: parsePositiveAmount(goalForm.fatG, DEFAULT_NUTRITION_GOALS.fatG),
      waterMl: parsePositiveAmount(goalForm.waterMl, DEFAULT_NUTRITION_GOALS.waterMl),
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
    const foodCount = selectedLog.meals.reduce((sum, meal) => sum + meal.items.length, 0);
    if (foodCount === 0 && selectedLog.waterMl === 0) {
      return; // rien à effacer
    }
    const parts = [
      foodCount > 0 ? pluralize(foodCount, 'aliment') : null,
      selectedLog.waterMl > 0 ? `${selectedLog.waterMl} ml d'eau` : null,
    ].filter(Boolean);
    confirmDestructive({
      title: 'Réinitialiser la journée ?',
      message: `${parts.join(' et ')} ${parts.length > 1 || foodCount > 1 ? 'seront effacés' : 'sera effacé'} pour cette date.`,
      confirmLabel: 'Réinitialiser',
      onConfirm: () => resetDay(selectedDateKey),
    });
  };

  const handleRemoveFood = (slot: MealSlot, foodId: string) => {
    const food = selectedLog.meals
      .find((meal) => meal.slot === slot)
      ?.items.find((item) => item.id === foodId);
    confirmDestructive({
      title: `Supprimer « ${food?.name || 'cet aliment'} » ?`,
      message: food ? `${Math.round(food.calories)} kcal seront retirées de ce repas.` : 'Cet aliment sera retiré de ce repas.',
      onConfirm: () => removeFoodItem(selectedDateKey, slot, foodId),
    });
  };

  const hasEntries =
    selectedLog.waterMl > 0 || selectedLog.meals.some((meal) => meal.items.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Nutrition"
        actions={<Button label="Objectifs" icon="flag-outline" variant="tinted" size="sm" onPress={openGoalsModal} />}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <NutritionDailyView
          dateKey={selectedDateKey}
          log={selectedLog}
          goals={goals}
          totals={totals}
          onPreviousDay={() => navigateDay(-1)}
          onNextDay={() => navigateDay(1)}
          onToday={() => setSelectedDateKey(getLocalDateKey())}
          onAddFood={openAddFood}
          onRemoveFood={handleRemoveFood}
          onAddWater={handleAddWater}
        />

        <NutritionWeeklySummary summary={weeklySummary} />

        {hasEntries ? (
          <Button
            label="Effacer cette journée"
            icon="refresh-outline"
            variant="plain"
            tone="danger"
            size="sm"
            onPress={handleResetDay}
          />
        ) : null}
      </ScrollView>

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

      <Sheet visible={foodModalVisible} onClose={closeFoodModal} title="Ajouter un aliment" size="large">
        <View style={styles.slotRow}>
          {MEAL_SLOT_OPTIONS.map(([slot, label]) => {
            const isActive = activeMealSlot === slot;
            return (
              <Pressable
                key={slot}
                onPress={() => setActiveMealSlot(slot)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                style={[styles.slotChip, { backgroundColor: isActive ? colors.primary : colors.cardMuted }]}
              >
                <Text style={[typography.captionStrong, { color: isActive ? colors.onPrimary : colors.text }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Nom" value={foodForm.name} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, name: text }))} placeholder="Ex : poulet grillé" />
        <View style={styles.fieldRow}>
          <Field label="Quantité" value={foodForm.quantity} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, quantity: text }))} placeholder="1" keyboardType="decimal-pad" />
          <Field label="Unité" value={foodForm.unit} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, unit: text }))} placeholder="g" />
        </View>
        <Field label="Calories (kcal)" value={foodForm.calories} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, calories: text }))} placeholder="0" keyboardType="decimal-pad" />
        <View style={styles.fieldRow}>
          <Field label="Protéines (g)" dotColor={colors.protein} value={foodForm.proteinG} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, proteinG: text }))} placeholder="0" keyboardType="decimal-pad" />
          <Field label="Glucides (g)" dotColor={colors.carbs} value={foodForm.carbsG} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, carbsG: text }))} placeholder="0" keyboardType="decimal-pad" />
          <Field label="Lipides (g)" dotColor={colors.fat} value={foodForm.fatG} onChangeText={(text) => setFoodForm((prev) => ({ ...prev, fatG: text }))} placeholder="0" keyboardType="decimal-pad" />
        </View>

        <Button label="Ajouter au journal" icon="add" onPress={handleValidateFood} />
      </Sheet>

      <Sheet visible={goalsModalVisible} onClose={closeGoalsModal} title="Objectifs quotidiens">
        <Field label="Calories (kcal)" value={goalForm.calories} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, calories: text }))} placeholder="2000" keyboardType="number-pad" />
        <View style={styles.fieldRow}>
          <Field label="Protéines (g)" dotColor={colors.protein} value={goalForm.proteinG} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, proteinG: text }))} placeholder="140" keyboardType="number-pad" />
          <Field label="Glucides (g)" dotColor={colors.carbs} value={goalForm.carbsG} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, carbsG: text }))} placeholder="220" keyboardType="number-pad" />
          <Field label="Lipides (g)" dotColor={colors.fat} value={goalForm.fatG} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, fatG: text }))} placeholder="70" keyboardType="number-pad" />
        </View>
        <Field label="Eau (ml)" dotColor={colors.water} value={goalForm.waterMl} onChangeText={(text) => setGoalForm((prev) => ({ ...prev, waterMl: text }))} placeholder="2500" keyboardType="number-pad" />

        <Button label="Enregistrer les objectifs" icon="checkmark" onPress={handleValidateGoals} />
      </Sheet>
    </View>
  );
}

const MEAL_SLOT_OPTIONS: Array<[MealSlot, string]> = [
  ['breakfast', 'Petit-déj'],
  ['lunch', 'Déjeuner'],
  ['dinner', 'Dîner'],
  ['snack', 'Collation'],
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  dotColor,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  dotColor?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'number-pad';
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
        <Text style={[typography.captionStrong, { color: colors.subtleText }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <TextInput
        style={[typography.body, styles.fieldInput, { color: colors.text, backgroundColor: colors.cardMuted }]}
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
  contentContainer: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl, gap: spacing.md },
  slotRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  slotChip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1, gap: spacing.xs + 2 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  fieldInput: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
});
