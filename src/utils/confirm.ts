import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  /** Libellé du bouton de confirmation (par défaut « Supprimer »). */
  confirmLabel?: string;
  onConfirm: () => void;
};

/**
 * Demande une confirmation avant une action destructive (suppression, remise à zéro...).
 * Sur le web, `Alert.alert` avec des boutons n'est pas supporté : on utilise `window.confirm`.
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel = 'Supprimer',
  onConfirm,
}: ConfirmOptions) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/** « 1 séance », « 3 séances », « 0 séance ». */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`;
}

/** Rappel affiché avant de supprimer un modèle : les séries effectuées ne sont pas perdues. */
export function keptHistoryNote(setCount: number) {
  if (setCount === 0) return '';
  return setCount === 1
    ? "La série déjà enregistrée reste dans l'historique et les statistiques."
    : `Les ${setCount} séries déjà enregistrées restent dans l'historique et les statistiques.`;
}

/** Assemble les lignes non vides d'un message. */
export function joinLines(...lines: string[]) {
  return lines.filter(Boolean).join('\n');
}
