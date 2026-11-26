import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SetIntensity } from '../models';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/tokens';

export const SET_INTENSITY_ORDER: SetIntensity[] = ['faible', 'modere', 'intense'];

export const INTENSITY_LABELS: Record<SetIntensity, string> = {
  faible: 'Faible',
  modere: 'Modéré',
  intense: 'Intense',
};

// Couleurs sémantiques du thème : vert → orange → rouge, lisibles en clair comme en sombre.
export const intensityColor = (colors: ThemeColors, intensity: SetIntensity) =>
  intensity === 'intense' ? colors.danger : intensity === 'modere' ? colors.warning : colors.success;

const ACTIVE_BAR_COUNT: Record<SetIntensity, number> = { faible: 1, modere: 2, intense: 3 };
const BAR_HEIGHTS = [6, 10, 14];

type Props = {
  value?: SetIntensity;
  onChange: (next: SetIntensity) => void;
};

/** Pastille cliquable qui fait défiler l'intensité ressentie de la série. */
export default function IntensityIndicator({ value, onChange }: Props) {
  const colors = useThemeColors();
  const current: SetIntensity = value ?? 'faible';
  const activeColor = intensityColor(colors, current);
  const activeCount = ACTIVE_BAR_COUNT[current];

  const handlePress = () => {
    const currentIndex = SET_INTENSITY_ORDER.indexOf(current);
    onChange(SET_INTENSITY_ORDER[(currentIndex + 1) % SET_INTENSITY_ORDER.length]);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.cardMuted },
        pressed && { opacity: 0.6 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Intensité : ${INTENSITY_LABELS[current]}`}
      accessibilityHint="Appuyer pour changer l'intensité de la série"
    >
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((height, index) => (
          <View
            key={height}
            style={[
              styles.bar,
              { height, backgroundColor: index < activeCount ? activeColor : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[typography.captionStrong, styles.label, { color: activeColor }]}>
        {INTENSITY_LABELS[current]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 2 },
  label: { fontSize: 12, minWidth: 48 },
});
