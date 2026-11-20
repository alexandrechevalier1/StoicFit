import { Image, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '../../theme/useThemeColors';
import { radius } from '../../theme/tokens';
import type { IconName } from './IconButton';

type Props = {
  imageUri?: string;
  /** Icône affichée quand il n'y a pas de photo. */
  fallbackIcon: IconName;
  size?: number;
  /** En mode édition : affiche un badge appareil photo et rend la vignette cliquable. */
  editable?: boolean;
  onPress?: () => void;
};

export default function Thumbnail({ imageUri, fallbackIcon, size = 48, editable, onPress }: Props) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!editable}
      accessibilityRole={editable ? 'button' : 'image'}
      accessibilityLabel={editable ? 'Changer la photo' : undefined}
      style={[
        styles.container,
        { width: size, height: size, backgroundColor: colors.primarySoft },
      ]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <Ionicons name={fallbackIcon} size={Math.round(size * 0.46)} color={colors.primary} />
      )}

      {editable ? (
        <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
          <Ionicons name="camera" size={11} color={colors.onPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%', borderRadius: radius.md },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
