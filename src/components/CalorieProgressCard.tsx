import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/tokens';
import { formatInteger } from '../utils/format';

type Props = {
  consumedCalories: number;
  targetCalories: number;
};

/**
 * Carte principale de la journée : calories consommées, restantes et jauge.
 * La zone cible (±10 % de l'objectif) est dessinée en fond de jauge.
 */
export default function CalorieProgressCard({ consumedCalories, targetCalories }: Props) {
  const colors = useThemeColors();
  const target = Math.max(1, targetCalories);
  const rangeMin = Math.round(target * 0.9);
  const rangeMax = Math.round(target * 1.1);
  const barMax = target * 1.3;

  const consumed = Math.round(consumedCalories);
  const remaining = Math.round(target - consumed);
  const isOver = consumed > rangeMax;

  const toPercent = (value: number) => `${Math.min(100, (value / barMax) * 100)}%` as const;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[typography.caption, { color: colors.subtleText }]}>Consommées</Text>
          <Text style={[styles.bigNumber, { color: colors.text }]}>
            {formatInteger(consumed)}
            <Text style={[typography.headline, { color: colors.subtleText }]}> / {formatInteger(target)} kcal</Text>
          </Text>
        </View>
        <View style={styles.remaining}>
          <Text style={[typography.caption, { color: colors.subtleText }]}>{remaining >= 0 ? 'Restantes' : 'Dépassement'}</Text>
          <Text style={[typography.numberLarge, { color: remaining >= 0 ? colors.primary : colors.warning }]}>
            {formatInteger(Math.abs(remaining))}
          </Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: colors.cardMuted }]}>
        <View
          style={[
            styles.zone,
            { left: toPercent(rangeMin), width: `${((rangeMax - rangeMin) / barMax) * 100}%`, backgroundColor: colors.primarySoft },
          ]}
        />
        <View style={[styles.fill, { width: toPercent(consumed), backgroundColor: isOver ? colors.warning : colors.primary }]} />
      </View>

      <Text style={[typography.caption, { color: colors.subtleText }]}>
        Zone cible : {formatInteger(rangeMin)} – {formatInteger(rangeMax)} kcal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bigNumber: { fontSize: 36, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  remaining: { alignItems: 'flex-end' },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  zone: { position: 'absolute', top: 0, bottom: 0 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
});
