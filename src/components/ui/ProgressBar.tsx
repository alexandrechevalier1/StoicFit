import { StyleSheet, View } from 'react-native';
import { useThemeColors } from '../../theme/useThemeColors';

type Props = {
  /** Progression entre 0 et 1 (bornée automatiquement). */
  progress: number;
  color: string;
  height?: number;
};

export default function ProgressBar({ progress, color, height = 8 }: Props) {
  const colors = useThemeColors();
  const ratio = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.cardMuted }]}>
      <View style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
});
