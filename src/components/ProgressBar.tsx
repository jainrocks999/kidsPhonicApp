import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme';

export function ProgressBar({ value, color = colors.green, height = 12 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color, height, borderRadius: height }} />
    </View>
  );
}

const styles = StyleSheet.create({ track: { backgroundColor: colors.border, overflow: 'hidden', borderRadius: radius.pill } });
