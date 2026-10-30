import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  BounceIn,
  Easing,
  ZoomIn,
  ZoomOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { play, playSfx, praise, stopVoice } from '@/services/audio';
import { sfx } from '@/assets';
import { sample, shuffle } from '@/hooks/shuffle';
import { colors, levelColors, levelDark, radius, shadow, space } from '@/theme';
import type { Word } from '@/data/types';
import type { GameProps } from './types';

const PAIRS = 6;
const PEEK_MS = 2600; // all cards face-up at the start: "remember them!"
const MISMATCH_MS = 900;
const SPARKS = ['✨', '⭐', '💫', '🌟'];
type Card = { key: string; word: string; face: 'pic' | 'text' };
type Mood = 'idle' | 'happy' | 'oops' | 'party' | 'peek';
const MASCOT: Record<Mood, string> = { idle: '🦊', happy: '🤩', oops: '🙈', party: '🥳', peek: '👀' };

export function MemoryMatch({ level, words, onFinish }: GameProps) {
  const picked = useMemo(() => sample(words, PAIRS), [words]);
  const cards = useMemo<Card[]>(
    () =>
      shuffle(
        picked.flatMap((w) => [
          { key: `${w.word}-p`, word: w.word, face: 'pic' as const },
          { key: `${w.word}-t`, word: w.word, face: 'text' as const },
        ]),
      ),
    [picked],
  );
  const [open, setOpen] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [peek, setPeek] = useState(true);
  const [mood, setMood] = useState<Mood>('peek');
  const [streak, setStreak] = useState(0);
  const flips = useRef(0);
  const accent = levelColors[level.number - 1];
  const edge = levelDark[level.number - 1];

  // every timeout goes through here, so leaving the game cancels them all
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
  useEffect(() => {
    later(() => {
      setPeek(false);
      setMood('idle');
    }, PEEK_MS);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      stopVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = (c: Card) => {
    if (peek || open.length === 2 || open.includes(c.key) || matched.has(c.word)) return;
    const now = [...open, c.key];
    setOpen(now);
    if (now.length < 2) return;
    flips.current++;
    const [a, b] = now.map((k) => cards.find((x) => x.key === k)!);
    if (a.word === b.word) {
      const m = new Set(matched).add(a.word);
      setMatched(m);
      setStreak((s) => s + 1);
      const done = m.size === picked.length;
      if (done) {
        praise();
        setMood('party');
      } else {
        playSfx(sfx.correct);
        play(undefined, a.word); // say the word we just matched
        setMood('happy');
        later(() => setMood('idle'), 900);
      }
      setOpen([]);
      if (done) later(() => onFinish(Math.min(1, (picked.length * 1.5) / flips.current)), 1500);
    } else {
      setStreak(0);
      setMood('oops');
      setWrong(now);
      later(() => {
        setOpen([]);
        setWrong([]);
        setMood('idle');
      }, MISMATCH_MS);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Animated.View key={mood} entering={BounceIn}>
          <AppText variant="title">{MASCOT[mood]}</AppText>
        </Animated.View>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="heading">
            {Array.from({ length: picked.length }, (_, i) => (i < matched.size ? '⭐' : '☆')).join(' ')}
          </AppText>
          {peek && (
            <Animated.View entering={ZoomIn} exiting={ZoomOut}>
              <AppText variant="caption">👀 Remember!</AppText>
            </Animated.View>
          )}
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

      <View style={styles.grid}>
        {cards.map((c, i) => (
          <MemCard
            key={c.key}
            index={i}
            card={c}
            word={picked.find((p) => p.word === c.word)!}
            shown={peek || open.includes(c.key) || matched.has(c.word)}
            matched={matched.has(c.word)}
            wrong={wrong.includes(c.key)}
            accent={accent}
            edge={edge}
            onPress={() => flip(c)}
          />
        ))}
      </View>
    </View>
  );
}

function MemCard({
  index,
  card,
  word,
  shown,
  matched,
  wrong,
  accent,
  edge,
  onPress,
}: {
  index: number;
  card: Card;
  word: Word;
  shown: boolean;
  matched: boolean;
  wrong: boolean;
  accent: string;
  edge: string;
  onPress: () => void;
}) {
  const flipV = useSharedValue(shown ? 1 : 0);
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    flipV.set(withTiming(shown ? 1 : 0, { duration: 320, easing: Easing.inOut(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  useEffect(() => {
    if (wrong) {
      shake.set(
        withSequence(withTiming(-8, { duration: 50 }), withRepeat(withTiming(8, { duration: 80 }), 5, true), withTiming(0, { duration: 50 })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrong]);
  useEffect(() => {
    if (matched) pop.set(withSequence(withTiming(1.12, { duration: 150 }), withSpring(1, { damping: 7 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { scale: pop.value }] }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(flipV.value, [0, 1], [0, 180])}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(flipV.value, [0, 1], [180, 360])}deg` }],
  }));

  return (
    // cards "deal" in one by one; the flip/shake/pop transforms live on inner views
    <Animated.View entering={ZoomIn.delay(index * 70).springify().damping(13)} style={styles.slot}>
      <Animated.View style={[styles.fill, wrapStyle]}>
        <Pressy silent onPress={onPress} style={styles.fill}>
          {/* back: the colourful "?" side */}
          <Animated.View style={[styles.face, styles.back, { backgroundColor: accent, borderBottomColor: edge }, backStyle]}>
            <AppText style={styles.q}>?</AppText>
            <AppText style={styles.qDots}>✦ ✦</AppText>
          </Animated.View>
          {/* front: picture or word */}
          <Animated.View
            style={[
              styles.face,
              styles.front,
              matched && { borderColor: colors.green, backgroundColor: '#EAFBF0' },
              wrong && { borderColor: colors.red, backgroundColor: '#FFEDF0' },
              frontStyle,
            ]}
          >
            {card.face === 'pic' ? <WordPicture word={word} size={64} /> : <AppText variant="heading">{card.word}</AppText>}
            {matched && (
              <Animated.View entering={BounceIn} style={styles.check}>
                <AppText style={{ fontSize: 16, lineHeight: 20 }}>✅</AppText>
              </Animated.View>
            )}
          </Animated.View>
        </Pressy>
        {matched && <MatchSparks />}
      </Animated.View>
    </Animated.View>
  );
}

/** Four little stars pop out when a pair is found. */
function MatchSparks() {
  return (
    <View style={styles.sparks} pointerEvents="none">
      {SPARKS.map((e, i) => (
        <Spark key={i} emoji={e} angle={(i / SPARKS.length) * Math.PI * 2 + Math.PI / 4} />
      ))}
    </View>
  );
}

function Spark({ emoji, angle }: { emoji: string; angle: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(angle) * 46 * p.value },
      { translateY: Math.sin(angle) * 46 * p.value },
      { scale: 0.7 + p.value * 0.6 },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <AppText variant="heading">{emoji}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  streak: { width: 64, alignItems: 'center', paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.orange },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: space.sm,
    padding: space.md,
  },
  slot: { width: '30%', aspectRatio: 0.95 },
  fill: { width: '100%', height: '100%' },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    ...shadow,
  },
  back: { borderBottomWidth: 6 }, // chunky 3D edge
  front: { backgroundColor: colors.surface, borderWidth: 3, borderColor: 'transparent' },
  q: { fontSize: 38, lineHeight: 46, color: '#fff', fontFamily: undefined, fontWeight: '800' },
  qDots: { position: 'absolute', bottom: 8, fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  check: { position: 'absolute', top: 4, right: 6 },
  sparks: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});