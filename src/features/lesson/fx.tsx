import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { colors, fonts } from '@/theme';

/**
 * Wiggle-bounce while `active` (e.g. while its word is being spoken) and a springy
 * pop whenever `popKey` changes (new word / page).
 */
export function Bouncy({
  active,
  popKey,
  beatKey,
  strength = 1,
  style,
  children,
}: {
  active: boolean;
  popKey?: string | number;
  /** Changes on every spoken burst → a quick "boing" right on the sound. -1 = no beat. */
  beatKey?: number;
  strength?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);
  const lift = useSharedValue(0);
  const beat = useSharedValue(1);

  useEffect(() => {
    if (beatKey == null || beatKey < 0) return;
    beat.set(withSequence(withTiming(1 + 0.22 * strength, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 260 })));
  }, [beatKey, strength, beat]);

  useEffect(() => {
    if (popKey == null) return;
    scale.set(withSequence(withTiming(0.6, { duration: 0 }), withSpring(1, { damping: 7, stiffness: 180 })));
  }, [popKey, scale]);

  useEffect(() => {
    if (active) {
      const beat = 260;
      lift.set(withRepeat(withSequence(withTiming(-10 * strength, { duration: beat }), withTiming(0, { duration: beat })), -1));
      rot.set(withRepeat(withSequence(withTiming(-5 * strength, { duration: beat }), withTiming(5 * strength, { duration: beat })), -1, true));
      scale.set(withSpring(1 + 0.12 * strength, { damping: 8 }));
    } else {
      cancelAnimation(lift);
      cancelAnimation(rot);
      lift.set(withSpring(0));
      rot.set(withSpring(0));
      scale.set(withSpring(1, { damping: 9 }));
    }
  }, [active, strength, lift, rot, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { rotate: `${rot.value}deg` }, { scale: scale.value * beat.value }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Expanding rings behind something that is "talking". */
export function SoundWaves({ active, size, color }: { active: boolean; size: number; color: string }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {[0, 1, 2].map((i) => (
        <Wave key={i} delay={i * 450} active={active} size={size} color={color} />
      ))}
    </View>
  );
}

function Wave({ active, delay, size, color }: { active: boolean; delay: number; size: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (active) t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1350, easing: Easing.out(Easing.quad) }), -1, false)));
    else {
      cancelAnimation(t);
      t.set(0);
    }
  }, [active, delay, t]);
  const anim = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 0.55 * (1 - t.value),
    transform: [{ scale: 0.8 + t.value * 0.7 }],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size * 0.3, borderWidth: 6, borderColor: color }, anim]}
    />
  );
}

/**
 * Karaoke line: the chunk being said jumps up, grows and lights up; chunks already
 * said stay coloured, the rest wait in grey-ink.
 */
export function KaraokeLine({
  chunks,
  active,
  accent,
  size = 30,
  isKey,
  stagger,
}: {
  chunks: string[];
  /** Index being spoken, -1 = nothing. */
  active: number;
  accent: string;
  size?: number;
  /** Chunks that carry the lesson's sound — always drawn in the accent colour. */
  isKey?: (chunk: string) => boolean;
  /** ms between chunks floating in one after another (omit = all appear at once). */
  stagger?: number;
}) {
  return (
    <View style={styles.line}>
      {chunks.map((c, i) => {
        const chunk = <KaraokeChunk text={c} now={i === active} keyWord={!!isKey?.(c)} accent={accent} size={size} />;
        return stagger ? (
          // separate wrapper: an entering animation and the chunk's own transform would fight on one view
          <Animated.View key={`${i}-${c}`} entering={FadeInDown.delay(i * stagger).duration(320)}>
            {chunk}
          </Animated.View>
        ) : (
          <View key={`${i}-${c}`}>{chunk}</View>
        );
      })}
    </View>
  );
}

function KaraokeChunk({ text, now, keyWord, accent, size }: { text: string; now: boolean; keyWord: boolean; accent: string; size: number }) {
  const s = useSharedValue(1);
  const y = useSharedValue(0);
  useEffect(() => {
    s.set(withSpring(now ? 1.2 : 1, { damping: 7, stiffness: 200 }));
    y.set(withSpring(now ? -6 : 0, { damping: 8 }));
  }, [now, s, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Animated.View style={[styles.chunk, now && { backgroundColor: colors.yellow }, anim]}>
      <AppText
        style={{
          fontFamily: fonts.bold,
          fontSize: size,
          lineHeight: size * 1.25,
          color: keyWord ? accent : colors.text,
        }}>
        {text}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 6, rowGap: 8 },
  chunk: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
});

/** "What to do" pill at the top of every step. */
export function StepGuide({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={guide.pill}>
      <AppText style={guide.emoji}>{emoji}</AppText>
      <AppText style={guide.text} numberOfLines={2}>{text}</AppText>
    </View>
  );
}

const guide = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  emoji: { fontSize: 20, lineHeight: 26 },
  text: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.primaryDark, flexShrink: 1 },
});

/** Index of the span `ms` falls in (with a little lead-in so the UI isn't late), else -1. */
export function spanAt(spans: readonly (readonly [number, number])[] | undefined, ms: number, lead = 80, tail = 120) {
  if (!spans || ms < 0) return -1;
  return spans.findIndex(([a, b]) => ms >= a - lead && ms <= b + tail);
}

/** Which word (split on spaces) contains character `charIndex` of `text`. */
export function wordAt(text: string, charIndex: number) {
  return text.slice(0, charIndex).split(' ').length - 1;
}
