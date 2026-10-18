import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';

type NumericKeypadProps = {
  value: string;
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
  extraKey?: {
    label: string;
    active: boolean;
    onPress: () => void;
  };
};

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function NumericKeypad({ onDigitPress, onDeletePress, extraKey }: NumericKeypadProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, keyIndex) => {
            if (key === '') {
              if (!extraKey) {
                return <View key={keyIndex} style={styles.key} />;
              }
              return (
                <Pressable
                  key={keyIndex}
                  style={[
                    styles.key,
                    { backgroundColor: extraKey.active ? colors.primary : colors.card },
                  ]}
                  onPress={extraKey.onPress}
                  hitSlop={8}
                >
                  <Text style={[styles.extraKeyText, { color: extraKey.active ? '#fff' : colors.text }]}>
                    {extraKey.label}
                  </Text>
                </Pressable>
              );
            }
            if (key === 'del') {
              return (
                <Pressable
                  key={keyIndex}
                  style={[styles.key, { backgroundColor: colors.card }]}
                  onPress={onDeletePress}
                  hitSlop={8}
                >
                  <Text style={styles.deleteKeyText}>⌫</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={keyIndex}
                style={[styles.key, { backgroundColor: colors.card }]}
                onPress={() => onDigitPress(key)}
                hitSlop={8}
              >
                <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
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
  keyText: { fontSize: 20, fontWeight: '600' },
  extraKeyText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  deleteKeyText: { fontSize: 18, color: '#FF3B30', fontWeight: '600' },
});
