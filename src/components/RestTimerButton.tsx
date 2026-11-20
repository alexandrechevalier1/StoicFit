import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/tokens';
import { Button, IconButton } from './ui';

const PRESETS_SECONDS = [30, 60, 90, 120];

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function RestTimerButton() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
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
      <Pressable
        onPress={() => setIsMenuVisible(true)}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Minuteur de récupération"
        style={({ pressed }) => [
          styles.triggerButton,
          { backgroundColor: colors.primarySoft },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Ionicons name="timer-outline" size={22} color={colors.primary} />
        {isRunning && <View style={[styles.runningDot, { backgroundColor: colors.primary }]} />}
      </Pressable>

      <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={handleClose}>
          <Animated.View
            style={[
              styles.panel,
              {
                marginTop: insets.top + 8,
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.panelContent}>
              <View style={styles.headerRow}>
                <Text style={[typography.headline, { color: colors.text }]}>Récupération</Text>
                <IconButton icon="close" label="Fermer" tone="neutral" size={36} onPress={handleClose} />
              </View>

              <Text style={[styles.countdown, { color: remainingSeconds <= 0 ? colors.success : colors.text }]}>
                {formatSeconds(Math.max(0, remainingSeconds))}
              </Text>

              <View style={styles.presetsRow}>
                {PRESETS_SECONDS.map((seconds) => (
                  <Pressable
                    key={seconds}
                    style={({ pressed }) => [
                      styles.presetButton,
                      { backgroundColor: colors.cardMuted },
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={() => handleSelectPreset(seconds)}
                    accessibilityRole="button"
                    accessibilityLabel={`Lancer ${seconds} secondes`}
                  >
                    <Text style={[typography.captionStrong, styles.tabular, { color: colors.text }]}>
                      {formatSeconds(seconds)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.controlsRow}>
                <View style={styles.flex}>
                  <Button
                    label={isRunning ? 'Pause' : 'Démarrer'}
                    icon={isRunning ? 'pause' : 'play'}
                    onPress={handleToggleRunning}
                  />
                </View>
                <View style={styles.flex}>
                  <Button label="Réinitialiser" icon="refresh" variant="tinted" onPress={handleReset} />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  triggerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
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
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  panelContent: { gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdown: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  presetsRow: { flexDirection: 'row', gap: spacing.sm },
  presetButton: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  controlsRow: { flexDirection: 'row', gap: spacing.sm },
});
