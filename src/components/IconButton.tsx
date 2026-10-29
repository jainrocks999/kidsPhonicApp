import { StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Pressy } from './Pressy';
import { colors, shadow } from '@/theme';

/** Round emoji icon button (back, speaker, settings…). Emoji keeps the app dependency-free of icon fonts. */
export function IconButton({
  icon,
  onPress,
  size = 48,
  color = colors.surface,
  accessibilityLabel,
}: {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressy
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.btn, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <AppText style={{ fontSize: size * 0.45 }}>{icon}</AppText>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', ...shadow },
});
