import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { DailyNutritionLog, MealSlot, NutritionGoals, NutritionTotals } from '../models';
import { getLocalDateKey, parseLocalDateKey } from '../utils/nutritionDate';
import CalorieProgressCard from './CalorieProgressCard';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/tokens';
import { formatInteger, formatRelativeDay, formatWeight } from '../utils/format';
import { IconButton, ProgressBar } from './ui';

const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collations',
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
  onAddWater: (amountMl: number) => void;
};

const WATER_QUICK_ADD_ML = [250, 500];

const formatLiters = (ml: number) => `${formatWeight(Math.round(ml / 100) / 10)} L`;

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
  onAddWater,
}: Props) {
  const colors = useThemeColors();
  const isToday = dateKey === getLocalDateKey();
  const date = parseLocalDateKey(dateKey);
  const longDate = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <View style={styles.dateRow}>
        <IconButton icon="chevron-back" label="Jour précédent" variant="tinted" size={40} onPress={onPreviousDay} />
        <View style={styles.dateCenter}>
          <Text style={[typography.headline, styles.capitalize, { color: colors.text }]}>
            {formatRelativeDay(date.toISOString())}
          </Text>
          {isToday ? (
            <Text style={[typography.caption, { color: colors.subtleText }]}>{longDate}</Text>
          ) : (
            <Pressable onPress={onToday} hitSlop={8} accessibilityRole="button">
              <Text style={[typography.captionStrong, { color: colors.primary }]}>Revenir à aujourd'hui</Text>
            </Pressable>
          )}
        </View>
        <IconButton icon="chevron-forward" label="Jour suivant" variant="tinted" size={40} onPress={onNextDay} />
      </View>

      <CalorieProgressCard consumedCalories={totals.calories} targetCalories={goals.calories} />

      <View style={styles.macrosRow}>
        <MacroTile label="Protéines" value={totals.proteinG} target={goals.proteinG} color={colors.protein} />
        <MacroTile label="Glucides" value={totals.carbsG} target={goals.carbsG} color={colors.carbs} />
        <MacroTile label="Lipides" value={totals.fatG} target={goals.fatG} color={colors.fat} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.rowBetween}>
          <View style={styles.inlineIcon}>
            <Ionicons name="water" size={18} color={colors.water} />
            <Text style={[typography.headline, { color: colors.text }]}>Hydratation</Text>
          </View>
          <Text style={[typography.number, { color: colors.text }]}>
            {formatLiters(totals.waterMl)}
            <Text style={[typography.caption, { color: colors.subtleText }]}> / {formatLiters(goals.waterMl)}</Text>
          </Text>
        </View>
        <ProgressBar progress={totals.waterMl / Math.max(1, goals.waterMl)} color={colors.water} height={10} />
        <View style={styles.waterButtons}>
          {WATER_QUICK_ADD_ML.map((amount) => (
            <Pressable
              key={amount}
              onPress={() => onAddWater(amount)}
              accessibilityRole="button"
              accessibilityLabel={`Ajouter ${amount} millilitres d'eau`}
              style={({ pressed }) => [
                styles.waterButton,
                { backgroundColor: colors.cardMuted },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="add" size={16} color={colors.water} />
              <Text style={[typography.captionStrong, { color: colors.text }]}>{amount} ml</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {MEAL_ORDER.map((slot) => {
        const items = log.meals.find((entry) => entry.slot === slot)?.items ?? [];
        const mealCalories = items.reduce((sum, item) => sum + item.calories, 0);
        return (
          <View key={slot} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[typography.headline, { color: colors.text }]}>{MEAL_LABELS[slot]}</Text>
                {items.length > 0 ? (
                  <Text style={[typography.caption, { color: colors.subtleText }]}>
                    {formatInteger(mealCalories)} kcal
                  </Text>
                ) : null}
              </View>
              <IconButton
                icon="add"
                label={`Ajouter un aliment au ${MEAL_LABELS[slot].toLowerCase()}`}
                variant="tinted"
                size={36}
                onPress={() => onAddFood(slot)}
              />
            </View>

            {items.length === 0 ? (
              <Text style={[typography.caption, { color: colors.subtleText }]}>Rien pour l'instant.</Text>
            ) : (
              items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.foodRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                      <Text style={[typography.caption, { color: colors.subtleText }]}>
                        {'  '}
                        {formatWeight(item.quantity)} {item.unit}
                      </Text>
                    </Text>
                    <View style={styles.macroLine}>
                      <Text style={[typography.captionStrong, { color: colors.text }]}>
                        {formatInteger(item.calories)} kcal
                      </Text>
                      <MacroDot color={colors.protein} value={item.proteinG} label="P" />
                      <MacroDot color={colors.carbs} value={item.carbsG} label="G" />
                      <MacroDot color={colors.fat} value={item.fatG} label="L" />
                    </View>
                  </View>
                  <IconButton
                    icon="trash-outline"
                    label={`Supprimer ${item.name}`}
                    tone="danger"
                    size={36}
                    onPress={() => onRemoveFood(slot, item.id)}
                  />
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function MacroDot({ color, value, label }: { color: string; value: number; label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.macroDotRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[typography.caption, styles.tabular, { color: colors.subtleText }]}>
        {label} {formatWeight(Math.round(value))} g
      </Text>
    </View>
  );
}

function MacroTile({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.macroTile, { backgroundColor: colors.card }]}>
      <Text style={[typography.captionStrong, { color: colors.subtleText }]}>{label}</Text>
      <Text style={[typography.number, { color: colors.text }]}>
        {Math.round(value)}
        <Text style={[typography.caption, { color: colors.subtleText }]}> / {Math.round(target)} g</Text>
      </Text>
      <ProgressBar progress={value / Math.max(1, target)} color={color} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  flex: { flex: 1 },
  capitalize: { textTransform: 'capitalize' },
  tabular: { fontVariant: ['tabular-nums'] },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateCenter: { flex: 1, alignItems: 'center', gap: 2 },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  macrosRow: { flexDirection: 'row', gap: spacing.sm },
  macroTile: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs + 2 },
  waterButtons: { flexDirection: 'row', gap: spacing.sm },
  waterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    borderRadius: radius.pill,
  },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  macroLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2, flexWrap: 'wrap' },
  macroDotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
