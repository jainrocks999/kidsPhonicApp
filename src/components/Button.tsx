import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Pressy } from './Pressy';
import { colors, radius, shadow } from '@/theme';

export function Button({
  label,
  onPress,
  color = colors.primary,
  variant = 'solid',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const solid = variant === 'solid';
  return (
    <Pressy
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        solid ? { backgroundColor: color, borderBottomColor: 'rgba(0,0,0,0.18)' } : { borderColor: color, borderWidth: 2 },
        disabled && { opacity: 0.4 },
        style,
      ]}>
      <AppText variant="heading" style={{ color: solid ? '#fff' : color, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 56,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
});
