import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { AppText } from './AppText';
import { fonts } from '@/theme';

/** Kid-friendly letter colours — every one readable on white. */
export const RAINBOW = ['#FF4D6D', '#FF8A00', '#F5B400', '#1FBF5F', '#1E9BFF', '#8A4DFF', '#FF4FC3'];

const colorAt = (i: number, offset: number, palette: readonly string[] = RAINBOW) => palette[(i + offset) % palette.length];

/** Static text with every letter a different colour (spaces don't use up a colour). */
export function RainbowText({
  text,
  size = 18,
  offset = 0,
  style,
  numberOfLines,
  palette,
}: {
  text: string;
  size?: number;
  offset?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Colours to cycle through — defaults to the full rainbow. */
  palette?: readonly string[];
}) {
  let n = 0;
  return (
    <AppText
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={!!numberOfLines}
      minimumFontScale={0.6}
      style={[styles.base, { fontSize: size, lineHeight: size * 1.25 }, style]}>
      {[...text].map((ch, i) => (
        // plain Text so it inherits the parent's size/font (AppText would reset to 16px body)
        <Text key={i} style={{ color: /\s/.test(ch) ? undefined : colorAt(n++, offset, palette) }}>
          {ch}
        </Text>
      ))}
    </AppText>
  );
}

/** Big bouncy rainbow letters — a wave runs through them. Wraps on spaces. */
export function WavyRainbow({
  text,
  size = 44,
  offset = 0,
  palette,
}: {
  text: string;
  size?: number;
  offset?: number;
  palette?: readonly string[];
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false));
  }, [t]);

  let n = 0;
  return (
    <View style={styles.wrap}>
      {text.split(' ').filter(Boolean).map((word, w) => (
        <View key={w} style={styles.word}>
          {[...word].map((ch) => {
            const i = n++;
            return <WavyChar key={i} ch={ch} index={i} size={size} color={colorAt(i, offset, palette)} t={t} />;
          })}
        </View>
      ))}
    </View>
  );
}

function WavyChar({ ch, index, size, color, t }: { ch: string; index: number; size: number; color: string; t: SharedValue<number> }) {
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin((t.value - index * 0.09) * Math.PI * 2) * size * 0.08 }],
  }));
  return (
    <Animated.View style={anim}>
      <AppText style={[styles.base, styles.big, { fontSize: size, lineHeight: size * 1.2, color }]}>{ch}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.bold,
    textShadowColor: 'rgba(43,42,76,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  big: { textShadowOffset: { width: 0, height: 4 } },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14 },
  word: { flexDirection: 'row' },
});
