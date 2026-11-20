import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '../../theme/useThemeColors';
import { radius, spacing, typography } from '../../theme/tokens';
import type { IconName } from './IconButton';

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** filled : action principale · tinted : action secondaire · plain : lien. */
  variant?: 'filled' | 'tinted' | 'plain';
  tone?: 'primary' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
};

export default function Button({
  label,
  onPress,
  icon,
  variant = 'filled',
  tone = 'primary',
  size = 'md',
  disabled,
}: Props) {
  const colors = useThemeColors();
  const toneColor = tone === 'danger' ? colors.danger : colors.primary;

  const backgroundColor =
    variant === 'filled' ? toneColor : variant === 'tinted' ? colors.primarySoft : 'transparent';
  const contentColor = variant === 'filled' ? colors.onPrimary : toneColor;
  const textStyle = size === 'sm' ? typography.captionStrong : typography.bodyStrong;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={size === 'sm' ? 8 : 0}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={contentColor} /> : null}
      <Text style={[textStyle, { color: contentColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
  },
  sm: { minHeight: 32, paddingHorizontal: spacing.md },
  md: { minHeight: 48, paddingHorizontal: spacing.lg },
});
