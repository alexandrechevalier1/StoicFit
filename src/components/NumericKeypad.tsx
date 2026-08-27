import { StyleSheet, Text, View, Pressable } from 'react-native';

type NumericKeypadProps = {
  value: string;
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
};

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function NumericKeypad({ onDigitPress, onDeletePress }: NumericKeypadProps) {
  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, keyIndex) => {
            if (key === '') {
              return <View key={keyIndex} style={styles.key} />;
            }
            if (key === 'del') {
              return (
                <Pressable
                  key={keyIndex}
                  style={styles.key}
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
                style={styles.key}
                onPress={() => onDigitPress(key)}
                hitSlop={8}
              >
                <Text style={styles.keyText}>{key}</Text>
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
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 20, color: '#000', fontWeight: '600' },
  deleteKeyText: { fontSize: 18, color: '#FF3B30', fontWeight: '600' },
});
