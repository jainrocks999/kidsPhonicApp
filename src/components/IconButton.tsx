import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressy } from './Pressy';
import { colors, shadow } from '@/theme';

/** Darken a #rrggbb colour for the button's 3D bottom edge. */
function shade(hex: string, amount = 0.22) {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/** Chunky 3D rounded-square button with an SVG icon (back, speaker, settings…). */
export function IconButton({
  icon,
  onPress,
  size = 48,
  color = colors.surface,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}) {
  const light = color.toUpperCase() === '#FFFFFF' || color === colors.surface;
  const edge = light ? colors.border : shade(color);
  return (
    <Pressy
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: color, borderBottomColor: edge },
      ]}>
      <View style={[styles.shine, { width: size * 0.3, height: size * 0.12, borderRadius: size }]} />
      <Icon name={icon} size={size * 0.5} color={light ? colors.primary : '#fff'} />
    </Pressy>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 6,
    ...shadow,
  },
  shine: {
    position: 'absolute',
    top: '12%',
    left: '14%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ rotate: '-25deg' }],
  },
});
