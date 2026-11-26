import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type ClockTimerNativeModule = {
  startTimer(seconds: number, message: string): boolean;
};

// Absent dans Expo Go et sur iOS : on retombe alors sur le minuteur interne.
const ClockTimer =
  Platform.OS === 'android' ? requireOptionalNativeModule<ClockTimerNativeModule>('ClockTimer') : null;

export const isClockTimerAvailable = ClockTimer != null;

/** Lance un minuteur dans l'Horloge du téléphone. Renvoie true si c'est fait. */
export function startClockTimer(seconds: number, message: string): boolean {
  if (!ClockTimer) return false;
  try {
    return ClockTimer.startTimer(Math.round(seconds), message);
  } catch {
    return false;
  }
}
