import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/tokens';
import { Button, IconButton } from './ui';
import { startClockTimer } from '../../modules/clock-timer';

const PRESETS_SECONDS = [30, 60, 90, 120];

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const CLOCK_MESSAGE = 'StoicFit · Récupération';

export default function RestTimerButton() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [selectedSeconds, setSelectedSeconds] = useState(PRESETS_SECONDS[0]);
  // Le décompte repose sur une heure de fin : il reste juste même si l'app
  // passe en arrière-plan (les timers JS y sont suspendus).
  const [endAt, setEndAt] = useState<number | null>(null);
  const [clockEndAt, setClockEndAt] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const slideAnim = useRef(new Animated.Value(-260)).current;

  const isRunning = endAt != null;
  const remainingSeconds = isRunning
    ? Math.max(0, Math.ceil((endAt - now) / 1000))
    : isFinished
      ? 0
      : selectedSeconds;
  const isClockRunning = clockEndAt != null && clockEndAt > now;

  useEffect(() => {
    if (!isMenuVisible) return;
    setNow(Date.now());
    slideAnim.setValue(-260);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isMenuVisible, slideAnim]);

  useEffect(() => {
    if (!isRunning && !isClockRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [isRunning, isClockRunning]);

  useEffect(() => {
    if (endAt == null || now < endAt) return;
    setEndAt(null);
    setIsFinished(true);
    // L'Horloge sonne déjà : on ne vibre que si elle n'a pas pu être lancée.
    if (clockEndAt == null) Vibration.vibrate(400);
  }, [endAt, now, clockEndAt]);

  const handleClose = () => setIsMenuVisible(false);

  const start = (seconds: number) => {
    const startedAt = Date.now();
    setSelectedSeconds(seconds);
    setIsFinished(false);
    setNow(startedAt);
    setEndAt(startedAt + seconds * 1000);
    setClockEndAt(startClockTimer(seconds, CLOCK_MESSAGE) ? startedAt + seconds * 1000 : null);
  };

  const handleStop = () => {
    setEndAt(null);
    setIsFinished(false);
  };

  const statusMessage = isRunning
    ? isClockRunning
      ? "Lancé aussi dans l'Horloge : il sonnera même si tu quittes l'app."
      : null
    : isClockRunning
      ? "Le minuteur de l'Horloge tourne encore : arrête-le depuis sa notification."
      : isFinished
        ? 'Récupération terminée.'
        : null;

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

              <Text style={[styles.countdown, { color: isFinished ? colors.success : colors.text }]}>
                {formatSeconds(remainingSeconds)}
              </Text>
              {statusMessage ? (
                <Text style={[typography.caption, styles.status, { color: colors.subtleText }]}>
                  {statusMessage}
                </Text>
              ) : null}

              <View style={styles.presetsRow}>
                {PRESETS_SECONDS.map((seconds) => (
                  <Pressable
                    key={seconds}
                    style={({ pressed }) => [
                      styles.presetButton,
                      { backgroundColor: colors.cardMuted },
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={() => start(seconds)}
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
                  {isRunning ? (
                    <Button label="Arrêter" icon="stop" variant="tinted" tone="danger" onPress={handleStop} />
                  ) : (
                    <Button label="Démarrer" icon="play" onPress={() => start(selectedSeconds)} />
                  )}
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
  status: { textAlign: 'center', marginTop: -spacing.sm },
  presetsRow: { flexDirection: 'row', gap: spacing.sm },
  presetButton: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  controlsRow: { flexDirection: 'row', gap: spacing.sm },
});
