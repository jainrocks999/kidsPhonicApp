import { Text, type TextProps, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

type Variant = 'title' | 'heading' | 'body' | 'caption' | 'huge';

export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[styles.base, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontFamily: fonts.regular },
  huge: { fontFamily: fonts.bold, fontSize: 96, lineHeight: 112 },
  title: { fontFamily: fonts.bold, fontSize: 28 },
  heading: { fontFamily: fonts.bold, fontSize: 20 },
  body: { fontSize: 16, fontFamily: fonts.sansMedium },
  caption: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.sansMedium },
});
