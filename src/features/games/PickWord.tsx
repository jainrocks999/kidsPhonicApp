import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  BounceIn,
  Easing,
  FadeInDown,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { sample, shuffle } from '@/hooks/shuffle';
import { speak } from '@/services/audio';
import { colors, radius, shadow, space, unitColors, unitDark } from '@/theme';
import { useRounds } from './useRounds';
import type { GameProps } from './types';

type Mood = 'idle' | 'happy' | 'oops';
type OptionState = 'idle' | 'right' | 'wrong' | 'dim';

const MASCOT: Record<Mood, string> = { idle: '🦉', happy: '🤩', oops: '🙈' };
const SPARKLES = ['✨', '⭐', '💫', '🌟', '✨', '⭐'];
const RIGHT_DARK = '#13A850';
const WRONG_DARK = '#D63A5A';

export function PickWord({ words, onFinish }: GameProps) {
  const { item, index, total, answer } = useRounds(words, onFinish);
  const options = useMemo(
    () => shuffle([item, ...sample(words.filter((w) => w.word !== item.word), 2)]),
    [item, words],
  );

  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [mood, setMood] = useState<Mood>('idle');
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New word → clean slate (also covers the hook moving on by itself).
  useEffect(() => {
    setPicked(null);
    setMood('idle');
    locked.current = false;
  }, [item]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const choose = (w: (typeof options)[number]) => {
    if (locked.current) return;
    locked.current = true;
    const ok = w.word === item.word;
    setPicked(w.word);
    setMood(ok ? 'happy' : 'oops');
    if (ok) {
      setStreak((s) => s + 1);
      // let the happy animation play before moving on
      timer.current = setTimeout(() => answer(true), 900);
    } else {
      setStreak(0);
      answer(false);
      // wrong: shake, then let the child try again
      timer.current = setTimeout(() => {
        setPicked(null);
        setMood('idle');
        locked.current = false;
      }, 800);
    }
  };

  const hear = () => speak(item.word, { rate: 0.7 });

  // Picture: floats gently, hops when the answer is right.
  const float = useSharedValue(0);
  const hop = useSharedValue(0);
  useEffect(() => {
    float.set(
      withRepeat(
        withSequence(withTiming(-8, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })),
        -1,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (mood === 'happy') hop.set(withSequence(withTiming(-28, { duration: 150 }), withSpring(0, { damping: 6 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);
  const pictureStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value + hop.value }] }));

  return (
    <View style={styles.root}>
      {/* progress dots instead of a plain "1/5" */}
      <View style={styles.topRow}>
        <Animated.View key={mood} entering={BounceIn}>
          <AppText variant="title">{MASCOT[mood]}</AppText>
        </Animated.View>
        <View style={styles.dots}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < index && { backgroundColor: colors.green, borderColor: colors.green },
                i === index && { borderColor: colors.primary, width: 24 },
              ]}
            />
          ))}
        </View>
        {streak >= 2 ? (
          <Animated.View key={streak} entering={ZoomIn.springify()} exiting={ZoomOut} style={styles.streak}>
            <AppText variant="heading" style={{ color: '#fff' }}>
              🔥 x{streak}
            </AppText>
          </Animated.View>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      <Animated.View key={item.word} entering={ZoomIn.springify().damping(12)} style={styles.pictureWrap}>
        <Animated.View style={pictureStyle}>
          <Pressy onPress={hear} style={styles.picture}>
            <WordPicture word={item} size={180} />
            <View style={styles.speaker}>
              <AppText variant="heading">🔊</AppText>
            </View>
          </Pressy>
        </Animated.View>
        {mood === 'happy' && <Sparkles />}
      </Animated.View>

      <View style={{ gap: space.md }}>
        {options.map((w, i) => {
          const state: OptionState =
            picked == null ? 'idle' : w.word === picked ? (w.word === item.word ? 'right' : 'wrong') : 'dim';
          return (
            <Option
              key={`${item.word}-${w.word}`}
              word={w.word}
              index={i}
              state={state}
              color={unitColors[i % unitColors.length]}
              dark={unitDark[i % unitDark.length]}
              onPress={() => choose(w)}
            />
          );
        })}
      </View>
    </View>
  );
}

function Option({
  word,
  index,
  state,
  color,
  dark,
  onPress,
}: {
  word: string;
  index: number;
  state: OptionState;
  color: string;
  dark: string;
  onPress: () => void;
}) {
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (state === 'wrong') {
      shake.set(
        withSequence(withTiming(-10, { duration: 50 }), withRepeat(withTiming(10, { duration: 80 }), 5, true), withTiming(0, { duration: 50 })),
      );
    }
    if (state === 'right') pop.set(withSequence(withTiming(1.1, { duration: 140 }), withSpring(1, { damping: 8 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const style = useAnimatedStyle(() => ({
    opacity: state === 'dim' ? 0.45 : 1,
    transform: [{ translateX: shake.value }, { scale: pop.value }],
  }));
  const bg = state === 'right' ? colors.green : state === 'wrong' ? colors.red : color;
  const edge = state === 'right' ? RIGHT_DARK : state === 'wrong' ? WRONG_DARK : dark;
  return (
    // entrance on the outer view, feedback transforms on the inner one — they don't fight
    <Animated.View entering={FadeInDown.delay(index * 120).springify().damping(14)}>
      <Animated.View style={style}>
        <Pressy silent onPress={onPress} style={[styles.option, { backgroundColor: bg, borderBottomColor: edge }]}>
          <AppText variant="title" style={{ color: '#fff' }}>
            {word}
          </AppText>
          {state === 'right' && <AppText style={styles.mark}>✅</AppText>}
          {state === 'wrong' && <AppText style={styles.mark}>🙈</AppText>}
        </Pressy>
      </Animated.View>
    </Animated.View>
  );
}

/** Stars that fly out of the picture on a right answer. */
function Sparkles() {
  return (
    <View style={styles.sparkles} pointerEvents="none">
      {SPARKLES.map((emoji, i) => (
        <Spark key={i} emoji={emoji} angle={(i / SPARKLES.length) * Math.PI * 2} />
      ))}
    </View>
  );
}

function Spark({ emoji, angle }: { emoji: string; angle: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(angle) * 130 * p.value },
      { translateY: Math.sin(angle) * 130 * p.value },
      { scale: 0.6 + p.value },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <AppText variant="title">{emoji}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border, backgroundColor: '#fff' },
  streak: { width: 64, alignItems: 'center', paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.orange },
  pictureWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  picture: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, ...shadow },
  speaker: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
    ...shadow,
  },
  sparkles: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  option: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6, // chunky 3D edge
  },
  mark: { fontSize: 22, lineHeight: 28 },
});