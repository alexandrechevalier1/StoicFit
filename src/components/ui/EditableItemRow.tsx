import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '../../theme/useThemeColors';
import { radius, spacing, typography } from '../../theme/tokens';
import IconButton, { type IconName } from './IconButton';
import Thumbnail from './Thumbnail';

type Props = {
  name: string;
  /** Note libre saisie par l'utilisateur (ex. « Haut du corps »). */
  note?: string;
  /** Info calculée affichée après la note (ex. « 3 séances »). */
  meta?: string;
  imageUri?: string;
  fallbackIcon: IconName;
  isEditing: boolean;
  namePlaceholder: string;
  notePlaceholder: string;
  onPress: () => void;
  onChangeName: (text: string) => void;
  onChangeNote: (text: string) => void;
  onPickImage: () => void;
  onDelete: () => void;
};

/**
 * Ligne de liste « carte » partagée par Programmes / Séances / Exercices.
 * - Lecture : vignette, nom, ligne secondaire, chevron → toute la carte est cliquable.
 * - Édition : vignette cliquable (photo), champs nom + note, bouton corbeille.
 */
export default function EditableItemRow({
  name,
  note,
  meta,
  imageUri,
  fallbackIcon,
  isEditing,
  namePlaceholder,
  notePlaceholder,
  onPress,
  onChangeName,
  onChangeNote,
  onPickImage,
  onDelete,
}: Props) {
  const colors = useThemeColors();
  const secondary = [note?.trim(), meta].filter(Boolean).join(' · ');
  const inputStyle = [styles.input, { backgroundColor: colors.cardMuted, color: colors.text }];

  return (
    <Pressable
      onPress={onPress}
      disabled={isEditing}
      accessibilityRole={isEditing ? undefined : 'button'}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        pressed && !isEditing && { opacity: 0.7 },
      ]}
    >
      <Thumbnail imageUri={imageUri} fallbackIcon={fallbackIcon} editable={isEditing} onPress={onPickImage} />

      <View style={styles.body}>
        {isEditing ? (
          <>
            <TextInput
              style={[typography.bodyStrong, inputStyle]}
              value={name}
              onChangeText={onChangeName}
              placeholder={namePlaceholder}
              placeholderTextColor={colors.subtleText}
            />
            <TextInput
              style={[typography.caption, inputStyle]}
              value={note ?? ''}
              onChangeText={onChangeNote}
              placeholder={notePlaceholder}
              placeholderTextColor={colors.subtleText}
            />
          </>
        ) : (
          <>
            <Text style={[typography.headline, { color: colors.text }]} numberOfLines={1}>
              {name.trim() || namePlaceholder}
            </Text>
            {secondary ? (
              <Text style={[typography.caption, { color: colors.subtleText }]} numberOfLines={1}>
                {secondary}
              </Text>
            ) : null}
          </>
        )}
      </View>

      {isEditing ? (
        <IconButton icon="trash-outline" label={`Supprimer ${name}`} tone="danger" onPress={onDelete} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  body: { flex: 1, gap: spacing.xs },
  input: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
});
