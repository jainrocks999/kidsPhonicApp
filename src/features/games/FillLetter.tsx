import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  interpolateColor,
  withSequence,
  FadeInDown,
  SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { play, stopVoice } from '@/services/audio';
import { sample, shuffle } from '@/hooks/shuffle';
import { colors, levelColors, radius, shadow, space, unitColors, unitDark } from '@/theme';
import { useRounds } from './useRounds';
import type { GameProps } from './types';
import type { Word } from '@/data/types';

type Mood = 'idle' | 'happy' | 'oops';
const MASCOT: Record<Mood, string> = { idle: '🐰', happy: '🤩', oops: '🙈' };
const GAP = 6; // between letter tiles
const GRAB = 36; // extra forgiveness around the blank, in px
type Rect = { x: number; y: number; w: number; h: number };

/** Splits a word into [before, missing, after] around the chunk the unit teaches. */
export function missingChunk(word: Word, patterns: string[]): [string, string, string] {
  const w = word.word.toLowerCase();
  if (word.split && word.patternIndex != null) {
    const before = word.split.slice(0, word.patternIndex).join('');
    const mid = word.split[word.patternIndex];
    return [before, mid, word.split.slice(word.patternIndex + 1).join('')];
  }
  const hit = [...patterns].sort((a, b) => b.length - a.length).find((p) => w.includes(p.toLowerCase()));
  const mid = hit?.toLowerCase() ?? w[0];
  const at = w.indexOf(mid);
  return [w.slice(0, at), mid, w.slice(at + mid.length)];
}

export function FillLetter({ level, words, patterns, onFinish }: GameProps) {
  const { width } = useWindowDimensions();
  const pool = useMemo(() => words.filter((w) => !/\s|-/.test(w.word)), [words]);
  const { item, index, total, answer } = useRounds(pool, onFinish);
  const [before, missing, after] = missingChunk(item, patterns);
  const options = useMemo(() => {
    const others = [...new Set(patterns.map((p) => p.toLowerCase()))].filter((p) => p !== missing);
    return shuffle([missing, ...sample(others, 2)]);
  }, [missing, patterns]);
  const accent = levelColors[level.number - 1];

  // letter tiles shrink for long words so the whole word always fits on one line
  const letters = before.length + missing.length + after.length;
  const tileW = Math.max(30, Math.min(56, Math.floor((width - space.lg * 2 - GAP * (letters - 1)) / letters)));
  const tileH = Math.round(tileW * 1.3);
  const slotW = missing.length * tileW + (missing.length - 1) * GAP;

  const [placed, setPlaced] = useState<string | null>(null); // the chip that landed in the blank
  const [wrong, setWrong] = useState<{ label: string; n: number } | null>(null);
  const [mood, setMood] = useState<Mood>('idle');
  const [streak, setStreak] = useState(0);
  const locked = useRef(false);

  // timeouts all go through here → cancelled when the game closes
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      stopVoice();
    },
    [],
  );

  // where the blank is on screen (window coordinates) — read on the UI thread while dragging
  const slotRef = useRef<ComponentRef<typeof View>>(null);
  const slot = useSharedValue<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const hover = useSharedValue(0);
  const measure = () => slotRef.current?.measureInWindow((x, y, w, h) => slot.set({ x, y, w, h }));

  useEffect(() => {
    setPlaced(null);
    setWrong(null);
    setMood('idle');
    locked.current = false;
    play(undefined, item.word);
    // entrance animations move things for a moment → measure again once they settle
    const a = setTimeout(measure, 400);
    const b = setTimeout(measure, 1100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const drop = (label: string) => {
    if (locked.current) return;
    if (label === missing) {
      locked.current = true;
      setPlaced(label);
      setMood('happy');
      setStreak((s) => s + 1);
      later(() => answer(true), 1100);
    } else {
      setStreak(0);
      setMood('oops');
      setWrong((w) => ({ label, n: (w?.n ?? 0) + 1 }));
      answer(false);
      later(() => setMood('idle'), 800);
    }
  };

  // the blank lights up while a chip is hovering over it
  const glowStyle = useAnimatedStyle(() => ({ opacity: hover.value * 0.35 }));

  const tile = (ch: string, i: number, tint?: string) => (
    <View key={`${ch}-${i}`} style={[styles.tile, { width: tileW, height: tileH }, tint ? { backgroundColor: tint } : null]}>
      <AppText variant="huge" style={{ fontSize: Math.round(tileW * 0.72), lineHeight: Math.round(tileW * 0.95), color: tint ? '#fff' : colors.text }}>
        {ch}
      </AppText>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Animated.View key={mood} entering={FadeIn.duration(200)}>
          <AppText variant="title">{MASCOT[mood]}</AppText>
        </Animated.View>
        <View style={styles.dots}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < index && { backgroundColor: colors.green, borderColor: colors.green },
                i === index && { borderColor: accent, width: 24 },
              ]}
            />
          ))}
        </View>
        {streak >= 2 ? (
          <View style={styles.streak}>
            <AppText variant="heading" style={{ color: '#fff' }}>
              🔥 x{streak}
            </AppText>
          </View>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      <Animated.View key={item.word} entering={FadeIn.duration(300)} style={styles.pictureWrap}>
        <Pressy onPress={() => play(undefined, item.word)} style={styles.picture}>
          <WordPicture word={item} size={150} />
          <View style={styles.speaker}>
            <AppText variant="heading">🔊</AppText>
          </View>
        </Pressy>
      </Animated.View>

      {/* the word, one tile per letter; the missing part is a dashed tile */}
      <View style={styles.wordRow}>
        {before.split('').map((ch, i) => tile(ch, i))}

        <View
          ref={slotRef}
          collapsable={false}
          onLayout={measure}
          style={[
            styles.slot,
            { width: slotW, height: tileH },
            placed ? styles.slotDone : { borderColor: accent },
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: accent, borderRadius: radius.sm }, glowStyle]} />
          {placed ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.slotLetters}>
              {missing.split('').map((ch, i) => tile(ch, i, colors.green))}
            </Animated.View>
          ) : (
            <AppText style={{ fontSize: Math.round(tileW * 0.6), color: accent, opacity: 0.4 }}>?</AppText>
          )}
        </View>

        {after.split('').map((ch, i) => tile(ch, i + 100))}
      </View>

      <AppText variant="caption" style={{ textAlign: 'center' }}>
        ⬆️
      </AppText>

      {/* higher zIndex so a dragged chip floats above the word and picture */}
      <View style={styles.options}>
        {options.map((o, i) => (
          <DragChip
            key={`${item.word}-${o}`}
            label={o}
            index={i}
            color={unitColors[i % unitColors.length]}
            dark={unitDark[i % unitDark.length]}
            slot={slot}
            hover={hover}
            placed={placed === o}
            disabled={placed != null}
            resetSignal={wrong?.label === o ? wrong.n : 0}
            onDrop={drop}
          />
        ))}
      </View>
    </View>
  );
}

function DragChip({
  label,
  index,
  color,
  dark,
  slot,
  hover,
  placed,
  disabled,
  resetSignal,
  onDrop,
}: {
  label: string;
  index: number;
  color: string;
  dark: string;
  slot: SharedValue<Rect>;
  hover: SharedValue<number>;
  placed: boolean;
  disabled: boolean;
  resetSignal: number;
  onDrop: (label: string) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const vis = useSharedValue(1);
  const err = useSharedValue(0); // brief red flash on a wrong answer
  const slide = { duration: 260, easing: Easing.out(Easing.cubic) };

  // wrong drop → glide straight back home (no bounce, no spring)
  useEffect(() => {
    if (resetSignal === 0) return;
    tx.set(withTiming(0, slide));
    ty.set(withTiming(0, slide));
    err.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 450 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // right drop → this chip fades into the blank
  useEffect(() => {
    if (placed) {
      vis.set(withTiming(0, { duration: 180 }));
      scale.set(withTiming(0.6, { duration: 180 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(8)
    .onBegin(() => {
      scale.set(withTiming(1.12, { duration: 120 }));
    })
    .onUpdate((e) => {
      tx.set(e.translationX);
      ty.set(e.translationY);
      const r = slot.value;
      const inside =
        e.absoluteX > r.x - GRAB && e.absoluteX < r.x + r.w + GRAB && e.absoluteY > r.y - GRAB && e.absoluteY < r.y + r.h + GRAB;
      hover.set(withTiming(inside ? 1 : 0, { duration: 120 }));
    })
    .onEnd((e) => {
      const r = slot.value;
      const inside =
        e.absoluteX > r.x - GRAB && e.absoluteX < r.x + r.w + GRAB && e.absoluteY > r.y - GRAB && e.absoluteY < r.y + r.h + GRAB;
      hover.set(withTiming(0, { duration: 120 }));
      if (inside) {
        runOnJS(onDrop)(label); // parent decides: right → fades in, wrong → resetSignal glides it back
      } else {
        tx.set(withTiming(0, slide));
        ty.set(withTiming(0, slide));
      }
    })
    .onFinalize(() => {
      if (!placed) scale.set(withTiming(1, { duration: 120 }));
    });

  // a quick tap works too: it answers with this chip, same as dropping it on the blank
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .maxDistance(10)
    .onEnd((_e, success) => {
      if (success) runOnJS(onDrop)(label);
    });

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(err.value, [0, 1], [color, colors.red]),
    opacity: vis.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(300)}>
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <Animated.View style={[styles.chip, { borderBottomColor: dark }, style]}>
          <AppText variant="title" style={{ color: '#fff' }}>
            {label}
          </AppText>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.md, justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border, backgroundColor: '#fff' },
  streak: { width: 64, alignItems: 'center', paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.orange },
  pictureWrap: { alignSelf: 'center' },
  picture: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, ...shadow },
  speaker: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
    ...shadow,
  },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: GAP },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderBottomWidth: 4,
    borderBottomColor: colors.border,
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 3,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  slotDone: { borderWidth: 0, backgroundColor: 'transparent' },
  slotLetters: { flexDirection: 'row', gap: GAP },
  options: { flexDirection: 'row', justifyContent: 'center', gap: space.md, zIndex: 20, elevation: 20 },
  chip: {
    minWidth: 84,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
    borderBottomWidth: 6, // chunky 3D edge
    ...shadow,
  },
});