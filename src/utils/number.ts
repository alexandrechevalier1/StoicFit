/** Séparateur décimal affiché à l'utilisateur (français). */
export const DECIMAL_SEPARATOR = ',';

/**
 * Convertit une saisie utilisateur en nombre, en acceptant la virgule française
 * ("12,5") comme le point ("12.5"). Retourne NaN si la saisie est vide ou invalide.
 */
export function parseDecimal(input: string | null | undefined): number {
  if (input == null) {
    return NaN;
  }
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (normalized === '' || normalized === '.') {
    return NaN;
  }
  if (!/^-?\d*\.?\d*$/.test(normalized)) {
    return NaN;
  }
  return Number(normalized);
}

/** Convertit un nombre en texte modifiable, avec la virgule française ("22,5"). */
export function toDecimalInput(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  return String(value).replace('.', DECIMAL_SEPARATOR);
}

type KeypadInputOptions = {
  /** Autorise la saisie d'une virgule. */
  allowDecimal?: boolean;
  /** Nombre maximum de chiffres après la virgule. */
  maxDecimals?: number;
  /** Nombre maximum de chiffres avant la virgule. */
  maxIntegerDigits?: number;
};

/**
 * Ajoute une touche du pavé numérique (un chiffre ou la virgule) à la saisie en cours,
 * en refusant les saisies invalides (deux virgules, trop de décimales, zéros en tête...).
 */
export function appendKeypadInput(
  current: string,
  key: string,
  { allowDecimal = false, maxDecimals = 2, maxIntegerDigits = 4 }: KeypadInputOptions = {}
): string {
  const separatorIndex = current.indexOf(DECIMAL_SEPARATOR);
  const hasSeparator = separatorIndex >= 0;

  if (key === DECIMAL_SEPARATOR || key === '.') {
    if (!allowDecimal || hasSeparator) {
      return current;
    }
    return `${current === '' ? '0' : current}${DECIMAL_SEPARATOR}`;
  }

  if (!/^\d$/.test(key)) {
    return current;
  }

  if (hasSeparator) {
    const decimals = current.length - separatorIndex - 1;
    return decimals >= maxDecimals ? current : current + key;
  }

  // Évite les "05" : un zéro seul en tête est remplacé par le chiffre tapé.
  if (current === '0') {
    return key;
  }

  return current.length >= maxIntegerDigits ? current : current + key;
}
