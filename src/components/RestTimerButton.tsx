import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';

const PRESETS_SECONDS = [30, 60, 90, 120];

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function RestTimerButton() {
  const colors = useThemeColors();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(PRESETS_SECONDS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const slideAnim = useRef(new Animated.Value(-260)).current;

  useEffect(() => {
    if (!isMenuVisible) return;
    slideAnim.setValue(-260);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isMenuVisible, slideAnim]);

  useEffect(() => {
    if (!isRunning) return;
    if (remainingSeconds <= 0) {
      setIsRunning(false);
      Vibration.vibrate(400);
      return;
    }
    const timeout = setTimeout(() => setRemainingSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
  }, [isRunning, remainingSeconds]);

  const handleClose = () => setIsMenuVisible(false);

  const handleSelectPreset = (seconds: number) => {
    setRemainingSeconds(seconds);
    setIsRunning(true);
  };

  const handleToggleRunning = () => {
    if (remainingSeconds <= 0) return;
    setIsRunning((v) => !v);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(PRESETS_SECONDS[0]);
  };

  return (
    <>
      <Pressable onPress={() => setIsMenuVisible(true)} hitSlop={12} style={styles.triggerButton}>
        <Text style={styles.triggerIcon}>⏱️</Text>
        {isRunning && <View style={[styles.runningDot, { backgroundColor: colors.primary }]} />}
      </Pressable>

      <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={handleClose}>
          <Animated.View
            style={[
              styles.panel,
              { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text }]}>Temps de récupération</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Text style={[styles.closeButton, { color: colors.primary }]}>{'✕'}</Text>
                </Pressable>
              </View>

              <Text style={[styles.countdown, { color: colors.text }]}>
                {formatSeconds(Math.max(0, remainingSeconds))}
              </Text>

              <View style={styles.presetsRow}>
                {PRESETS_SECONDS.map((seconds) => (
                  <Pressable
                    key={seconds}
                    style={[styles.presetButton, { borderColor: colors.border }]}
                    onPress={() => handleSelectPreset(seconds)}
                  >
                    <Text style={[styles.presetText, { color: colors.text }]}>{seconds}s</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.controlsRow}>
                <Pressable
                  style={[styles.controlButton, { backgroundColor: colors.primary }]}
                  onPress={handleToggleRunning}
                >
                  <Text style={styles.controlButtonText}>
                    {isRunning ? 'Pause' : 'Démarrer'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.controlButton, styles.resetButton, { borderColor: colors.border }]}
                  onPress={handleReset}
                >
                  <Text style={[styles.controlButtonText, { color: colors.text }]}>
                    Réinitialiser
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  triggerIcon: { fontSize: 20 },
  runningDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overlay: { flex: 1, justifyContent: 'flex-start' },
  panel: {
    marginTop: 56,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700' },
  closeButton: { fontSize: 18, fontWeight: '600' },
  countdown: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
  },
  presetsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetText: { fontSize: 14, fontWeight: '600' },
  controlsRow: { flexDirection: 'row', gap: 10 },
  controlButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButton: { backgroundColor: 'transparent', borderWidth: 1 },
  controlButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
