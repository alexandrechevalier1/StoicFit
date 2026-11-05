import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { DECIMAL_SEPARATOR } from '../utils/number';

type NumericKeypadProps = {
  value: string;
  /** Appelé avec un chiffre ("0"-"9") ou la virgule (",") si `allowDecimal`. */
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
  /** Affiche une touche virgule pour saisir des décimales (ex. 22,5 kg). */
  allowDecimal?: boolean;
  extraKey?: {
    label: string;
    active: boolean;
    onPress: () => void;
  };
};

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export default function NumericKeypad({
  onDigitPress,
  onDeletePress,
  allowDecimal = false,
  extraKey,
}: NumericKeypadProps) {
  const colors = useThemeColors();

  // La case en bas à gauche accueille la virgule si besoin, sinon la touche spéciale.
  // Si les deux sont demandées, la touche spéciale passe sur une ligne dédiée.
  const extraKeyInGrid = extraKey && !allowDecimal ? extraKey : undefined;
  const extraKeyOnOwnRow = extraKey && allowDecimal ? extraKey : undefined;

  const renderDigitKey = (key: string, label = key) => (
    <Pressable
      key={key}
      style={[styles.key, { backgroundColor: colors.card }]}
      onPress={() => onDigitPress(key)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={key === DECIMAL_SEPARATOR ? 'Virgule' : key}
    >
      <Text style={[styles.keyText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );

  const renderExtraKey = (
    key: NonNullable<NumericKeypadProps['extraKey']>,
    style: object = styles.key
  ) => (
    <Pressable
      key="extra"
      style={[style, { backgroundColor: key.active ? colors.primary : colors.card }]}
      onPress={key.onPress}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: key.active }}
      accessibilityLabel={key.label}
    >
      <Text style={[styles.extraKeyText, { color: key.active ? '#fff' : colors.text }]}>
        {key.label}
      </Text>
    </Pressable>
  );

  let bottomLeftKey;
  if (allowDecimal) {
    bottomLeftKey = renderDigitKey(DECIMAL_SEPARATOR);
  } else if (extraKeyInGrid) {
    bottomLeftKey = renderExtraKey(extraKeyInGrid);
  } else {
    bottomLeftKey = <View key="empty" style={styles.key} />;
  }

  return (
    <View style={styles.container}>
      {DIGIT_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => renderDigitKey(key))}
        </View>
      ))}
      <View style={styles.row}>
        {bottomLeftKey}
        {renderDigitKey('0')}
        <Pressable
          key="del"
          style={[styles.key, { backgroundColor: colors.card }]}
          onPress={onDeletePress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Effacer"
        >
          <Text style={styles.deleteKeyText}>⌫</Text>
        </Pressable>
      </View>
      {extraKeyOnOwnRow ? (
        <View style={styles.row}>{renderExtraKey(extraKeyOnOwnRow, styles.wideKey)}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  key: {
    flex: 1,
    marginHorizontal: 4,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideKey: {
    flex: 1,
    marginHorizontal: 4,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 20, fontWeight: '600' },
  extraKeyText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  deleteKeyText: { fontSize: 18, color: '#FF3B30', fontWeight: '600' },
});
