import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '../../theme/useThemeColors';
import { TOUCH_TARGET } from '../../theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IconName;
  onPress: () => void;
  /** Libellé lu par le lecteur d'écran (obligatoire : le bouton n'a pas de texte). */
  label: string;
  /** plain : icône seule · tinted : fond teinté · filled : fond plein (action principale). */
  variant?: 'plain' | 'tinted' | 'filled';
  tone?: 'primary' | 'neutral' | 'danger';
  size?: number;
  disabled?: boolean;
};

export default function IconButton({
  icon,
  onPress,
  label,
  variant = 'plain',
  tone = 'primary',
  size = 40,
  disabled,
}: Props) {
  const colors = useThemeColors();
  const toneColor = tone === 'danger' ? colors.danger : tone === 'neutral' ? colors.text : colors.primary;

  const backgroundColor =
    variant === 'filled' ? toneColor : variant === 'tinted' ? colors.primarySoft : 'transparent';
  const iconColor = variant === 'filled' ? colors.onPrimary : toneColor;
  const hitSlop = Math.max(0, (TOUCH_TARGET - size) / 2);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.6 },
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
