import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme/useThemeColors';
import { radius, spacing, typography } from '../../theme/tokens';
import IconButton from './IconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** large : hauteur fixe (pavés numériques) · auto : s'adapte au contenu. */
  size?: 'large' | 'auto';
};

/**
 * Feuille modale qui monte du bas de l'écran, utilisée pour toutes les saisies.
 * Gère la zone sûre du bas, le clavier et la fermeture (croix, fond, bouton retour Android).
 */
export default function Sheet({ visible, onClose, title, children, size = 'auto' }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
          <View
            style={[
              styles.sheet,
              size === 'large' ? styles.large : styles.auto,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.lg },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.header}>
              <Text style={[typography.headline, styles.title, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              <IconButton icon="close" label="Fermer" tone="neutral" variant="plain" size={36} onPress={onClose} />
            </View>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  large: { height: '82%' },
  auto: { maxHeight: '90%' },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  title: { flex: 1 },
  content: { paddingBottom: spacing.sm, gap: spacing.md },
});
