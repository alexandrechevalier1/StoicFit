import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DailyNutritionLog, MealSlot, NutritionGoals, NutritionTotals } from '../models';
import { getLocalDateKey, parseLocalDateKey } from '../utils/nutritionDate';
import CalorieProgressCard from './CalorieProgressCard';
import { useThemeColors } from '../theme/useThemeColors';

const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Snacks',
};

type Props = {
  dateKey: string;
  log: DailyNutritionLog;
  goals: NutritionGoals;
  totals: NutritionTotals;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onAddFood: (slot: MealSlot) => void;
  onRemoveFood: (slot: MealSlot, foodId: string) => void;
  onOpenGoals: () => void;
  onAddWater: (amountMl: number) => void;
};

const WATER_QUICK_ADD_ML = [250, 500];

export default function NutritionDailyView({
  dateKey,
  log,
  goals,
  totals,
  onPreviousDay,
  onNextDay,
  onToday,
  onAddFood,
  onRemoveFood,
  onOpenGoals,
  onAddWater,
}: Props) {
  const colors = useThemeColors();
  const todayKey = getLocalDateKey();
  const isToday = dateKey === todayKey;
  const dateLabel = parseLocalDateKey(dateKey).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const caloriesRemaining = Math.max(0, goals.calories - totals.calories);

  return (
    <View>
      <View style={styles.dateHeaderRow}>
        <Pressable style={[styles.dateNavButton, { borderColor: colors.border }]} onPress={onPreviousDay}>
          <Text style={[styles.dateNavText, { color: colors.text }]}>{'‹'}</Text>
        </Pressable>
        <Pressable style={styles.dateCenter} onPress={onToday}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>{dateLabel}</Text>
          <Text style={[styles.dateSubtitle, { color: colors.subtleText }]}>
            {isToday ? 'Aujourd’hui' : dateKey}
          </Text>
        </Pressable>
        <Pressable style={[styles.dateNavButton, { borderColor: colors.border }]} onPress={onNextDay}>
          <Text style={[styles.dateNavText, { color: colors.text }]}>{'›'}</Text>
        </Pressable>
      </View>

      <View style={styles.quickActionsRow}>
        <Pressable
          style={[styles.todayButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onToday}
        >
          <Text style={[styles.todayButtonText, { color: colors.text }]}>Aujourd’hui</Text>
        </Pressable>
        <Pressable
          style={[styles.todayButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onOpenGoals}
        >
          <Text style={[styles.todayButtonText, { color: colors.primary }]}>Objectifs</Text>
        </Pressable>
      </View>

      <CalorieProgressCard consumedCalories={totals.calories} targetCalories={goals.calories} />

      <View style={[styles.remainingCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.remainingLabel, { color: colors.subtleText }]}>Calories restantes</Text>
        <Text style={[styles.remainingValue, { color: colors.text }]}>{caloriesRemaining} kcal</Text>
      </View>

      <View style={styles.macrosGrid}>
        <MacroTile label="Protéines" value={totals.proteinG} target={goals.proteinG} color="#D9A441" />
        <MacroTile label="Glucides" value={totals.carbsG} target={goals.carbsG} color="#3E6FD9" />
        <MacroTile label="Lipides" value={totals.fatG} target={goals.fatG} color="#D9534F" />
      </View>

      <View style={[styles.waterCard, { backgroundColor: colors.card }]}>
        <View style={styles.waterHeaderRow}>
          <Text style={[styles.waterTitle, { color: colors.text }]}>Hydratation</Text>
          <Text style={[styles.waterValue, { color: colors.primary }]}>
            {totals.waterMl} / {goals.waterMl} ml
          </Text>
        </View>
        <View style={[styles.waterBarTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.waterBarFill,
              { width: `${Math.min(100, (totals.waterMl / Math.max(1, goals.waterMl)) * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.waterQuickAddRow}>
          {WATER_QUICK_ADD_ML.map((amount) => (
            <Pressable
              key={amount}
              style={[styles.waterQuickAddButton, { borderColor: colors.primary }]}
              onPress={() => onAddWater(amount)}
            >
              <Text style={[styles.waterQuickAddText, { color: colors.primary }]}>+{amount} ml</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {MEAL_ORDER.map((slot) => {
        const meal = log.meals.find((entry) => entry.slot === slot);
        return (
          <View key={slot} style={[styles.mealCard, { backgroundColor: colors.card }]}>
            <View style={styles.mealHeaderRow}>
              <View>
                <Text style={[styles.mealTitle, { color: colors.text }]}>{MEAL_LABELS[slot]}</Text>
                <Text style={[styles.mealSubtitle, { color: colors.subtleText }]}>
                  {meal?.items.length ?? 0} aliment(s)
                </Text>
              </View>
              <Pressable
                style={[styles.mealAddButton, { backgroundColor: colors.primary }]}
                onPress={() => onAddFood(slot)}
              >
                <Text style={styles.mealAddButtonText}>+</Text>
              </Pressable>
            </View>

            {(meal?.items ?? []).length === 0 ? (
              <Text style={[styles.emptyMeal, { color: colors.subtleText }]}>Aucun aliment ajouté.</Text>
            ) : (
              (meal?.items ?? []).map((item) => (
                <View key={item.id} style={[styles.foodRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.foodTextColumn}>
                    <Text style={[styles.foodName, { color: colors.text }]}>
                      {item.name} · {item.quantity} {item.unit}
                    </Text>
                    <Text style={[styles.foodMeta, { color: colors.subtleText }]}>
                      {item.calories} kcal · P {item.proteinG} g · G {item.carbsG} g · L {item.fatG} g
                    </Text>
                  </View>
                  <Pressable onPress={() => onRemoveFood(slot, item.id)} hitSlop={12}>
                    <Text style={[styles.removeFoodText, { color: colors.danger }]}>Supprimer</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

type MacroProps = {
  label: string;
  value: number;
  target: number;
  color: string;
};

function MacroTile({ label, value, target, color }: MacroProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.macroCard, { borderColor: colors.border }]}>
      <Text style={[styles.macroTitle, { color }]}>{label}</Text>
      <Text style={[styles.macroValue, { color: colors.text }]}>
        {value}
        <Text style={[styles.macroUnit, { color: colors.subtleText }]}> g</Text>
      </Text>
      <Text style={[styles.macroTarget, { color: colors.subtleText }]}>/ {target} g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavText: { fontSize: 24, fontWeight: '700' },
  dateCenter: { alignItems: 'center', flex: 1 },
  dateLabel: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  dateSubtitle: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  quickActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  todayButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  todayButtonText: { fontSize: 13, fontWeight: '600' },
  remainingCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: { fontSize: 13, fontWeight: '600' },
  remainingValue: { fontSize: 18, fontWeight: '700' },
  macrosGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  macroCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  macroTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  macroValue: { fontSize: 18, fontWeight: '700' },
  macroUnit: { fontSize: 12, fontWeight: '400' },
  macroTarget: { fontSize: 11, marginTop: 2 },
  waterCard: {
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
  waterTitle: { fontSize: 15, fontWeight: '700' },
  waterValue: { fontSize: 14, fontWeight: '700' },
  waterBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  waterBarFill: { height: '100%', borderRadius: 5, backgroundColor: '#5AC8FA' },
  waterQuickAddRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  waterQuickAddButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  waterQuickAddText: { fontSize: 13, fontWeight: '700' },
  mealCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitle: { fontSize: 16, fontWeight: '700' },
  mealSubtitle: { fontSize: 12, marginTop: 2 },
  mealAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealAddButtonText: { color: '#fff', fontSize: 22, fontWeight: '700', includeFontPadding: false },
  emptyMeal: { fontSize: 13 },
  foodRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  foodTextColumn: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '600' },
  foodMeta: { fontSize: 12, marginTop: 2 },
  removeFoodText: { fontSize: 13, fontWeight: '700' },
});
