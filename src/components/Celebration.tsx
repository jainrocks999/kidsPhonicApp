import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { AppText } from './AppText';
import { Pressy } from './Pressy';
import { colors, fonts, radius, shadow, space, unitColors } from '@/theme';
import { playSfx } from '@/services/audio';
import { sfx } from '@/assets';

const CONFETTI_COUNT = 26;
const RAYS = 14;

export function Celebration({
  visible,
  title,
  subtitle,
  stars,
  primary,
  secondary,
  emoji = '🎉',
  silent,
  accent = colors.primary,
}: {
  emoji?: string;
  silent?: boolean;
  visible: boolean;
  title: string;
  subtitle?: string;
  stars?: number;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
  /** colour of the title ribbon */
  accent?: string;
}) {
  useEffect(() => {
    if (visible && !silent) playSfx(sfx.complete);
  }, [visible, silent]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* a "not quite" result (silent) gets no party */}
        {!silent && <Sunburst />}
        {!silent && <Confetti />}

        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card}>
          {/* big badge sitting on the card's top edge */}
          <Animated.View entering={ZoomIn.delay(150).springify().damping(10)} style={styles.badge}>
            <AppText style={styles.badgeEmoji}>{emoji}</AppText>
          </Animated.View>

          {stars != null && (
            <View style={styles.stars}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  entering={ZoomIn.delay(350 + i * 200).springify().damping(9)}
                  style={i === 1 && styles.starMiddle}>
                  <AppText style={[styles.star, i >= stars && styles.starOff]}>⭐</AppText>
                </Animated.View>
              ))}
            </View>
          )}

          <Animated.View entering={FadeInDown.delay(250).duration(350)} style={styles.ribbon}>
            <Ribbon color={accent} />
            <View style={styles.ribbonBand}>
              <AppText style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                {title}
              </AppText>
            </View>
          </Animated.View>

          {subtitle ? (
            <Animated.View entering={FadeIn.delay(450)}>
              <AppText style={styles.subtitle} numberOfLines={3}>
                {subtitle}
              </AppText>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(550).duration(350)} style={styles.actions}>
            <Pressy onPress={primary.onPress} accessibilityRole="button" style={styles.primary}>
              <AppText style={styles.primaryText}>{primary.label}</AppText>
            </Pressy>
            {secondary && (
              <Pressy onPress={secondary.onPress} accessibilityRole="button" style={styles.secondary}>
                <AppText style={styles.secondaryText}>{secondary.label}</AppText>
              </Pressy>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** A classic award ribbon: a flat band with notched tails folded behind it — clearly not a button. */
function Ribbon({ color }: { color: string }) {
  const dark = shade(color, 0.72);
  const darker = shade(color, 0.5);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 300 64" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {/* tails */}
      <Polygon points="0,16 40,16 40,60 0,60 13,38" fill={dark} />
      <Polygon points="300,16 260,16 260,60 300,60 287,38" fill={dark} />
      {/* folds where the band tucks behind */}
      <Polygon points="24,50 40,50 40,60" fill={darker} />
      <Polygon points="276,50 260,50 260,60" fill={darker} />
      {/* band with a light top edge */}
      <Rect x={24} y={4} width={252} height={46} fill={color} />
      <Rect x={24} y={4} width={252} height={4} fill="#fff" opacity={0.3} />
    </Svg>
  );
}

/** Mixes a #rrggbb colour towards black (`amount` 1 = unchanged). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * amount);
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

/** Soft light rays slowly turning behind the card. */
function Sunburst() {
  const { width, height } = useWindowDimensions();
  const size = Math.max(width, height) * 1.3;
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(withRepeat(withTiming(360, { duration: 30000, easing: Easing.linear }), -1));
  }, [spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const r = size / 2;
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const b = a + Math.PI / RAYS;
    return `M${r} ${r} L${r + Math.cos(a) * r} ${r + Math.sin(a) * r} L${r + Math.cos(b) * r} ${r + Math.sin(b) * r} Z`;
  });
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(600)}
      style={[styles.sunburst, { width: size, height: size, left: (width - size) / 2, top: (height - size) / 2 }, style]}>
      <Svg width={size} height={size}>
        {rays.map((d, i) => (
          <Path key={i} d={d} fill="#FFF6C9" opacity={0.16} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Paper confetti drifting down the whole screen. */
function Confetti() {
  const { width, height } = useWindowDimensions();
  // random once per celebration (lazy state, not render)
  const [pieces] = useState(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      x: Math.random() * width,
      delay: Math.random() * 1800,
      duration: 2600 + Math.random() * 1800,
      spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 360),
      sway: 15 + Math.random() * 25,
      w: 8 + Math.random() * 6,
      h: 12 + Math.random() * 8,
      round: i % 4 === 0,
      color: unitColors[i % unitColors.length],
    })),
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  x,
  delay,
  duration,
  spin,
  sway,
  w,
  h,
  round,
  color,
  height,
}: {
  x: number;
  delay: number;
  duration: number;
  spin: number;
  sway: number;
  w: number;
  h: number;
  round: boolean;
  color: string;
  height: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1)));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value > 0 ? 1 : 0,
    transform: [
      { translateY: -30 + t.value * (height + 60) },
      { translateX: Math.sin(t.value * Math.PI * 4) * sway },
      { rotate: `${t.value * spin}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: 0, width: w, height: round ? w : h, borderRadius: round ? w / 2 : 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  sunburst: { position: 'absolute' },
  card: {
    width: '100%',
    maxWidth: 400,
    marginTop: 56,
    backgroundColor: colors.surface,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 10,
    borderBottomColor: colors.border,
    paddingTop: 70,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.md,
    ...shadow,
  },
  badge: {
    position: 'absolute',
    top: -62,
    alignSelf: 'center',
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: colors.yellow,
    borderWidth: 6,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  badgeEmoji: { fontSize: 64, lineHeight: 78 },
  stars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: -space.sm },
  starMiddle: { marginBottom: 12 },
  star: { fontSize: 44, lineHeight: 54 },
  starOff: { opacity: 0.2 },
  ribbon: { alignSelf: 'stretch', marginHorizontal: -space.lg - 12, height: 72 },
  // sits over the ribbon's band (top 4/64 → 50/64 of the height), clear of the tails
  ribbonBand: {
    position: 'absolute',
    top: '6%',
    height: '72%',
    left: '14%',
    right: '14%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  subtitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.textMuted, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xs },
  primary: {
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 7,
    borderBottomColor: '#13A850',
  },
  primaryText: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: '#fff' },
  secondary: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.border,
    borderBottomWidth: 6,
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.text },
});
