import { memo, useEffect, useId, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { space } from '@/theme';
import { stopVoice } from '@/services/audio';

type Pair = readonly [string, string];

export const THEMES = {
  candySky: {
    sky: ['#6FD3FF', '#B3C2FF', '#FFC2EA'],
    hills: [['#B8F5C8', '#8BE6A8'], ['#7BE39B', '#4CCB7A'], ['#4FCB7C', '#2FB065']] as Pair[],
    tree: '#3DBB72',
  },
  sunnyDay: {
    sky: ['#7FDBFF', '#C4F0FF', '#FFF2B5'],
    hills: [['#C9F59A', '#A6E873'], ['#8FE065', '#63CB4C'], ['#5CC956', '#3DB045']] as Pair[],
    tree: '#4CBF4C',
  },
  dreamy: {
    sky: ['#A98BFF', '#DDA9FF', '#FFC0E0'],
    hills: [['#B5F0DD', '#8EE3C8'], ['#79DDBE', '#4FC9A4'], ['#45C29D', '#2BA583']] as Pair[],
    tree: '#35B58F',
  },
  sunset: {
    sky: ['#FFAA5E', '#FF93BC', '#B99BFF'],
    hills: [['#B6EBB0', '#8DDB9A'], ['#78D68F', '#4DBE78'], ['#43B974', '#2C9E60']] as Pair[],
    tree: '#35AE6A',
  },
} as const;

export type ThemeName = keyof typeof THEMES;

const RAINBOW = ['#FF6B6B', '#FFA94D', '#FFE066', '#69DB7C', '#4DABF7', '#9775FA'];

/* ---------- static scene ---------- */

function Tree({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Rect x={-3} y={-24} width={6} height={24} rx={2} fill="#B07A52" />
      <Circle cx={0} cy={-38} r={17} fill={color} />
      <Circle cx={-10} cy={-28} r={12} fill={color} />
      <Circle cx={10} cy={-28} r={12} fill={color} />
      <Circle cx={-5} cy={-43} r={6} fill="#FFFFFF" opacity={0.18} />
    </G>
  );
}

function Flower({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <G transform={`translate(${x}, ${y})`}>
      <Circle cx={-4} cy={0} r={3.5} fill={c} />
      <Circle cx={4} cy={0} r={3.5} fill={c} />
      <Circle cx={0} cy={-4} r={3.5} fill={c} />
      <Circle cx={0} cy={4} r={3.5} fill={c} />
      <Circle cx={0} cy={0} r={2.5} fill="#FFE066" />
    </G>
  );
}

const StaticScene = memo(function StaticScene({ theme }: { theme: ThemeName }) {
  const { width: w, height: h } = useWindowDimensions();
  const uid = useId().replace(/:/g, '');
  const t = THEMES[theme];

  const rbCx = w * 0.6;
  const rbBase = h - 135;
  const rbR = Math.min(w * 0.42, 150);

  return (
    <Svg style={StyleSheet.absoluteFill} width={w} height={h} pointerEvents="none">
      <Defs>
        <LinearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0.25" y2="1">
          <Stop offset="0%" stopColor={t.sky[0]} />
          <Stop offset="55%" stopColor={t.sky[1]} />
          <Stop offset="100%" stopColor={t.sky[2]} />
        </LinearGradient>
        <RadialGradient id={`sun-${uid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFBC8" stopOpacity="1" />
          <Stop offset="45%" stopColor="#FFF08A" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#FFF08A" stopOpacity="0" />
        </RadialGradient>
        {t.hills.map((p, i) => (
          <LinearGradient key={i} id={`hill${i}-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={p[0]} />
            <Stop offset="100%" stopColor={p[1]} />
          </LinearGradient>
        ))}
      </Defs>

      <Rect x={0} y={0} width={w} height={h} fill={`url(#sky-${uid})`} />

      {/* sun glow */}
      <Circle cx={w * 0.84} cy={h * 0.09} r={95} fill={`url(#sun-${uid})`} />
      <Circle cx={w * 0.84} cy={h * 0.09} r={34} fill="#FFF7A8" />
      <Circle cx={w * 0.84} cy={h * 0.09} r={26} fill="#FFFBD0" />

      {/* rainbow */}
      {RAINBOW.map((c, i) => {
        const r = rbR - i * 11;
        return (
          <Path
            key={c}
            d={`M${rbCx - r},${rbBase} A${r},${r} 0 0 1 ${rbCx + r},${rbBase}`}
            stroke={c}
            strokeWidth={11}
            fill="none"
            opacity={0.55}
          />
        );
      })}

      {/* far hill + trees */}
      <Path
        d={`M0,${h} L0,${h - 150} Q${w * 0.3},${h - 215} ${w * 0.6},${h - 150} T${w},${h - 168} L${w},${h} Z`}
        fill={`url(#hill0-${uid})`}
      />
      <Tree x={w * 0.1} y={h - 140} s={0.9} color={t.tree} />
      <Tree x={w * 0.2} y={h - 150} s={0.65} color={t.tree} />
      <Tree x={w * 0.88} y={h - 135} s={1} color={t.tree} />

      {/* mid hill */}
      <Path
        d={`M0,${h} L0,${h - 100} Q${w * 0.25},${h - 158} ${w * 0.55},${h - 100} T${w},${h - 118} L${w},${h} Z`}
        fill={`url(#hill1-${uid})`}
      />

      {/* near hill */}
      <Path
        d={`M0,${h} L0,${h - 48} Q${w * 0.3},${h - 98} ${w * 0.62},${h - 50} T${w},${h - 64} L${w},${h} Z`}
        fill={`url(#hill2-${uid})`}
      />

      {/* flowers */}
      <Flower x={w * 0.08} y={h - 26} c="#FF7EB6" />
      <Flower x={w * 0.22} y={h - 38} c="#FFFFFF" />
      <Flower x={w * 0.38} y={h - 20} c="#FFD43B" />
      <Flower x={w * 0.58} y={h - 30} c="#FF7EB6" />
      <Flower x={w * 0.76} y={h - 22} c="#FFFFFF" />
      <Flower x={w * 0.92} y={h - 34} c="#FFD43B" />
    </Svg>
  );
});

/* ---------- animation helpers ---------- */

function useDrift(duration: number, startAt = 0) {
  const v = useRef(new Animated.Value(startAt)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    const first = Animated.timing(v, {
      toValue: 1,
      duration: duration * (1 - startAt),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    first.start(({ finished }) => {
      if (!finished) return;
      v.setValue(0);
      loop = Animated.loop(
        Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
      );
      loop.start();
    });
    return () => {
      first.stop();
      loop?.stop();
    };
  }, [v, duration, startAt]);
  return v;
}

function DriftingCloud({ top, scale, duration, startAt, opacity = 0.92 }: {
  top: number; scale: number; duration: number; startAt: number; opacity?: number;
}) {
  const { width: w } = useWindowDimensions();
  const v = useDrift(duration, startAt);
  const cw = 110 * scale;
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-cw, w] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top, left: 0, opacity, transform: [{ translateX }] }}
    >
      <Svg width={cw} height={56 * scale} viewBox="0 0 110 56">
        <Circle cx={30} cy={34} r={18} fill="#FFFFFF" />
        <Circle cx={55} cy={24} r={22} fill="#FFFFFF" />
        <Circle cx={80} cy={34} r={17} fill="#FFFFFF" />
        <Rect x={12} y={34} width={82} height={18} rx={9} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function TwinkleStar({ left, top, size = 22, color = '#FFE066', delay = 0 }: {
  left: number; top: number; size?: number; color?: string; delay?: number;
}) {
  const o = useRef(new Animated.Value(1)).current;
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(o, { toValue: 0.3, duration: 900, useNativeDriver: true }),
          Animated.timing(sc, { toValue: 0.75, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(o, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(sc, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o, sc, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left, top, opacity: o, transform: [{ scale: sc }] }}
    >
      <Svg width={size} height={size} viewBox="-12 -12 24 24">
        <Path d="M0,-10 L3,-3 L10,-3 L4,2 L6,10 L0,5 L-6,10 L-4,2 L-10,-3 L-3,-3 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

function Balloon({ left, top, color, delay = 0 }: { left: number; top: number; color: string; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -12, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y, delay]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, transform: [{ translateY: y }] }}>
      <Svg width={34} height={62} viewBox="0 0 34 62">
        <Path d="M17,48 C15,54 19,57 17,62" stroke="#FFFFFF" strokeWidth={1.5} fill="none" opacity={0.8} />
        <Path d="M17,46 L13,52 L21,52 Z" fill={color} />
        <Path d="M17,2 C3,2 0,18 6,30 C10,38 14,44 17,46 C20,44 24,38 28,30 C34,18 31,2 17,2 Z" fill={color} />
        <Path d="M10,12 C8,16 8,20 10,24" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.5} />
      </Svg>
    </Animated.View>
  );
}

function AnimatedLayer() {
  const { width: w, height: h } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* clouds: alag height, speed aur size */}
      <DriftingCloud top={h * 0.06} scale={0.7} duration={70000} startAt={0.4} opacity={0.7} />
      <DriftingCloud top={h * 0.12} scale={1.1} duration={60000} startAt={0.15} />
      <DriftingCloud top={h * 0.2} scale={0.9} duration={75000} startAt={0.8} opacity={0.85} />
      <DriftingCloud top={h * 0.3} scale={0.8} duration={80000} startAt={0.6} opacity={0.8} />
      <DriftingCloud top={h * 0.4} scale={1.0} duration={90000} startAt={0.3} opacity={0.75} />
      <DriftingCloud top={h * 0.5} scale={0.65} duration={95000} startAt={0.85} opacity={0.65} />
      <DriftingCloud top={h * 0.56} scale={0.85} duration={85000} startAt={0.05} opacity={0.6} />

      {/* stars: yellow + white, alag size aur delay */}
      <TwinkleStar left={w * 0.28} top={h * 0.07} size={24} delay={0} />
      <TwinkleStar left={w * 0.68} top={h * 0.2} size={16} color="#FFFFFF" delay={500} />
      <TwinkleStar left={w * 0.9} top={h * 0.4} size={22} delay={900} />
      <TwinkleStar left={w * 0.1} top={h * 0.36} size={15} color="#FFFFFF" delay={300} />
      <TwinkleStar left={w * 0.5} top={h * 0.44} size={14} color="#FFFFFF" delay={1200} />
      <TwinkleStar left={w * 0.06} top={h * 0.1} size={18} delay={600} />
      <TwinkleStar left={w * 0.42} top={h * 0.14} size={13} color="#FFFFFF" delay={1500} />
      <TwinkleStar left={w * 0.58} top={h * 0.08} size={20} color="#FFF3A0" delay={200} />
      <TwinkleStar left={w * 0.8} top={h * 0.27} size={14} color="#FFFFFF" delay={1000} />
      <TwinkleStar left={w * 0.2} top={h * 0.24} size={20} delay={1300} />
      <TwinkleStar left={w * 0.36} top={h * 0.33} size={12} color="#FFFFFF" delay={400} />
      <TwinkleStar left={w * 0.95} top={h * 0.52} size={16} color="#FFF3A0" delay={800} />
      <TwinkleStar left={w * 0.7} top={h * 0.48} size={18} delay={1100} />
      <TwinkleStar left={w * 0.04} top={h * 0.48} size={12} color="#FFFFFF" delay={1400} />

      <Balloon left={w * 0.05} top={h * 0.58} color="#FF7EB6" />
      <Balloon left={w * 0.14} top={h * 0.64} color="#FFD43B" delay={700} />
    </View>
  );
}

/* ---------- Screen ---------- */

export function Screen({
  title,
  back = true,
  right,
  children,
  bg,
  theme = 'candySky',
  animated = true,
  style,
}: {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  bg?: string; // agar diya to flat color
  theme?: ThemeName;
  animated?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.root, { backgroundColor: bg ?? THEMES[theme].sky[0] }]}>
      {!bg && <StaticScene theme={theme} />}
      {!bg && animated && <AnimatedLayer />}
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
        {(title || back || right) && (
          <View style={styles.header}>
            <View style={styles.side}>
              {back && (
                <IconButton
                  icon="⬅️"
                  accessibilityLabel="Back"
                  onPress={() => {
                    stopVoice();
                    if (router.canGoBack()) router.back();
                    else router.replace('/home');
                  }}
                />
              )}
            </View>
            <AppText variant="heading" numberOfLines={1} style={styles.title}>
              {title}
            </AppText>
            <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
          </View>
        )}
        <View style={[styles.body, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm },
  side: { width: 56 },
  title: { flex: 1, textAlign: 'center' },
  body: { flex: 1 },
});