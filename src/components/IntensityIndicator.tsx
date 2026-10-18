import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SetIntensity } from '../models';
import { useThemeColors } from '../theme/useThemeColors';

export const SET_INTENSITY_ORDER: SetIntensity[] = ['faible', 'modere', 'intense'];

const INTENSITY_LABELS: Record<SetIntensity, string> = {
  faible: 'Faible',
  modere: 'Modéré',
  intense: 'Intense',
};

const INTENSITY_COLORS: Record<SetIntensity, string> = {
  faible: '#0A84FF',
  modere: '#34C759',
  intense: '#FF3B30',
};

const ACTIVE_BAR_COUNT: Record<SetIntensity, number> = {
  faible: 1,
  modere: 2,
  intense: 3,
};

const BAR_HEIGHTS = [8, 12, 16];

type Props = {
  value?: SetIntensity;
  onChange: (next: SetIntensity) => void;
};

export default function IntensityIndicator({ value, onChange }: Props) {
  const colors = useThemeColors();
  const current: SetIntensity = value ?? 'faible';
  const activeColor = INTENSITY_COLORS[current];
  const activeCount = ACTIVE_BAR_COUNT[current];

  const handlePress = () => {
    const currentIndex = SET_INTENSITY_ORDER.indexOf(current);
    const next = SET_INTENSITY_ORDER[(currentIndex + 1) % SET_INTENSITY_ORDER.length];
    onChange(next);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Intensité : ${INTENSITY_LABELS[current]}`}
      accessibilityHint="Appuyer pour changer l'intensité de la série"
    >
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((height, index) => {
          const isActive = index < activeCount;
          return (
            <View
              key={height}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: isActive ? activeColor : colors.subtleText,
                },
                !isActive && styles.inactiveBar,
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.label, { color: activeColor }]}>{INTENSITY_LABELS[current]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 4,
    borderRadius: 1.5,
  },
  inactiveBar: {
    opacity: 0.35,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
