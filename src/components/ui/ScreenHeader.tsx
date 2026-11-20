import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme/useThemeColors';
import { SCREEN_PADDING, spacing, typography } from '../../theme/tokens';
import IconButton from './IconButton';

type Props = {
  title: string;
  /** Contexte affiché sous le titre (ex. le programme parent). */
  subtitle?: string;
  /** Affiche une flèche retour : l'écran est alors en mode « compact ». */
  onBack?: () => void;
  /** Boutons d'action à droite. */
  actions?: ReactNode;
};

/**
 * En-tête commun à tous les écrans. Gère la zone sûre (encoche / barre d'état).
 * - Écran racine (sans `onBack`) : grand titre.
 * - Écran empilé : flèche retour + titre compact sur une seule ligne.
 */
export default function ScreenHeader({ title, subtitle, onBack, actions }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isCompact = Boolean(onBack);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {onBack ? (
          <View style={styles.back}>
            <IconButton icon="chevron-back" label="Retour" onPress={onBack} tone="neutral" />
          </View>
        ) : null}

        <View style={styles.titleBlock}>
          <Text
            style={[isCompact ? typography.title : typography.largeTitle, { color: colors.text }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: colors.subtleText }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  back: { marginLeft: -spacing.sm, marginRight: spacing.xs },
  titleBlock: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.sm },
});
