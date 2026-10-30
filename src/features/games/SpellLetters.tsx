import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { sfx } from '@/assets';
import { play, playSfx, stopVoice, tryAgain } from '@/services/audio';
import type { Word } from '@/data/types';
import { shuffle } from '@/hooks/shuffle';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import { useRounds } from './useRounds';
import type { GameProps } from './types';

const GAP = 8;
const MAX_TILE = 64;
const FLIGHT = 190; // each half of the arc, ms (up, then down)
const STAGGER = 90; // finished word turns green letter by letter
type Mood = 'idle' | 'happy' | 'oops' | 'party';
const MASCOT: Record<Mood, string> = { idle: '🐻', happy: '😄', oops: '🙈', party: '🥳' };
const GLIDE = { duration: FLIGHT * 2, easing: Easing.inOut(Easing.cubic) };

export function SpellLetters({ level, words, onFinish }: GameProps) {
  // Keep spelling achievable: plain words up to 6 letters.
  const pool = useMemo(() => {
    const short = words.filter((w) => /^[a-z]{2,6}$/i.test(w.word));
    return short.length >= 3 ? short : words.filter((w) => /^[a-z]+$/i.test(w.word));
  }, [words]);
  const { item, index, total, answer } = useRounds(pool, onFinish);
  return (
    <SpellRound
      key={item.word}
      item={item}
      index={index}
      total={total}
      accent={levelColors[level.number - 1]}
      onSpelled={() => answer(true)}
    />
  );
}

type TileData = { ch: string; id: number };

function SpellRound({
  item,
  index,
  total,
  accent,
  onSpelled,
}: {
  item: Word;
  index: number;
  total: number;
  accent: string;
  onSpelled: () => void;
}) {
  const { width } = useWindowDimensions();
  const target = item.word.toLowerCase();
  const n = target.length;
  const [tiles] = useState<TileData[]>(() => shuffle(target.split('').map((ch, i) => ({ ch, id: i }))));
  const [used, setUsed] = useState<number[]>([]); // tile ids, in the order they were placed
  const [wrong, setWrong] = useState<{ id: number; n: number } | null>(null);
  const [mood, setMood] = useState<Mood>('idle');
  const done = used.length === n;

  // ---- board geometry: slots on top, tiles below, all the same size, so a tile lands exactly on its slot
  const W = width - space.lg * 2;
  const S = Math.min(MAX_TILE, Math.floor((W - (n - 1) * GAP) / n));
  const x0 = (W - (n * S + (n - 1) * GAP)) / 2;
  const slotX = (i: number) => x0 + i * (S + GAP);
  const TILE_Y = S + 48;

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

  useEffect(() => {
    play(undefined, item.word);
  }, [item]);

  const tap = (tile: TileData) => {
    if (done || used.includes(tile.id)) return;
    const expected = target[used.length];
    if (tile.ch !== expected) {
      tryAgain();
      setMood('oops');
      setWrong((w) => ({ id: tile.id, n: (w?.n ?? 0) + 1 }));
      later(() => setMood('idle'), 700);
      return;
    }
    playSfx(sfx.click);
    const next = [...used, tile.id];
    setUsed(next);
    if (next.length === n) {
      setMood('party');
      // wait for the last tile to land, then the letters light up one by one
      later(onSpelled, FLIGHT * 2 + n * STAGGER + 700);
    } else {
      setMood('happy');
      later(() => setMood('idle'), 600);
    }
  };

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
        <View style={{ width: 40 }} />
      </View>

      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.picture, done && { borderColor: colors.green }]}
      >
        <WordPicture word={item} size={140} />
        <IconButton icon="speaker" size={40} onPress={() => play(undefined, item.word)} />
      </Animated.View>

      <View style={[styles.board, { width: W, height: TILE_Y + S }]}>
        {/* answer slots — every letter has a clearly visible box */}
        {target.split('').map((_, i) => {
          const filled = i < used.length;
          const next = i === used.length;
          return (
            <View
              key={`slot-${i}`}
              style={[
                styles.slot,
                { left: slotX(i), width: S, height: S },
                next && { borderColor: accent },
                filled && { borderColor: done ? colors.green : accent },
              ]}
            >
              {filled && <Ripple color={done ? colors.green : accent} />}
              {done && <Sparkle delay={FLIGHT * 2 + i * STAGGER} />}
            </View>
          );
        })}

        {/* empty tray spots stay visible as ghosts once a tile has left */}
        {tiles.map((_, k) => (
          <View key={`ghost-${k}`} style={[styles.ghost, { left: slotX(k), top: TILE_Y, width: S, height: S }]} />
        ))}

        {/* tiles — each one flies in an arc from its tray spot to its slot */}
        {tiles.map((tile, k) => (
          <LetterTile
            key={tile.id}
            tile={tile}
            size={S}
            homeX={slotX(k)}
            homeY={TILE_Y}
            slotIdx={used.includes(tile.id) ? used.indexOf(tile.id) : null}
            slotX={used.includes(tile.id) ? slotX(used.indexOf(tile.id)) : null}
            accent={accent}
            done={done}
            wrongN={wrong?.id === tile.id ? wrong.n : 0}
            order={k}
            onPress={() => tap(tile)}
          />
        ))}
      </View>
    </View>
  );
}

function LetterTile({
  tile,
  size,
  homeX,
  homeY,
  slotIdx,
  slotX,
  accent,
  done,
  wrongN,
  order,
  onPress,
}: {
  tile: TileData;
  size: number;
  homeX: number;
  homeY: number;
  slotIdx: number | null;
  slotX: number | null;
  accent: string;
  done: boolean;
  wrongN: number;
  order: number;
  onPress: () => void;
}) {
  const tx = useSharedValue(homeX);
  const ty = useSharedValue(homeY);
  const lift = useSharedValue(0); // arc height during the flight
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);
  const sway = useSharedValue(0); // gentle idle drift while waiting in the tray
  const shake = useSharedValue(0);
  const placed = useSharedValue(0); // 0 in tray → 1 in slot
  const finished = useSharedValue(0); // word complete → green
  const err = useSharedValue(0); // quick red flash on a wrong tap
  const inSlot = slotX != null;

  // idle sway in the tray (each tile on its own rhythm)
  useEffect(() => {
    sway.set(
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 1200 + order * 110, easing: Easing.inOut(Easing.sin) }),
          withTiming(3, { duration: 1200 + order * 110, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fly to the slot: rise, turn a little, grow, then settle down onto it
  useEffect(() => {
    if (slotX == null) return;
    const dir = order % 2 ? 1 : -1;
    tx.set(withTiming(slotX, GLIDE));
    ty.set(withTiming(0, GLIDE));
    lift.set(
      withSequence(
        withTiming(-40, { duration: FLIGHT, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: FLIGHT, easing: Easing.in(Easing.quad) }),
      ),
    );
    scale.set(withSequence(withTiming(1.25, { duration: FLIGHT }), withTiming(1, { duration: FLIGHT })));
    rot.set(withSequence(withTiming(dir * 12, { duration: FLIGHT }), withTiming(0, { duration: FLIGHT })));
    placed.set(withDelay(FLIGHT, withTiming(1, { duration: FLIGHT })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotX]);

  // finished word: letters turn green one after another
  useEffect(() => {
    if (!done || slotIdx == null) return;
    finished.set(withDelay(FLIGHT * 2 + slotIdx * STAGGER, withTiming(1, { duration: 250 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // wrong tap: red flash + quick side-to-side shake
  useEffect(() => {
    if (wrongN === 0) return;
    err.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 450 })));
    shake.set(
      withSequence(
        withTiming(-7, { duration: 50 }),
        withTiming(7, { duration: 80 }),
        withTiming(-5, { duration: 70 }),
        withTiming(0, { duration: 60 }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrongN]);

  const style = useAnimatedStyle(() => {
    const base = interpolateColor(placed.value, [0, 1], [colors.surface, accent]);
    const full = interpolateColor(finished.value, [0, 1], [base, colors.green]);
    return {
      backgroundColor: interpolateColor(err.value, [0, 1], [full, colors.red]),
      shadowOpacity: 0.18 + lift.value * -0.004, // higher in the air → deeper shadow
      transform: [
        { translateX: tx.value + shake.value },
        { translateY: ty.value + lift.value + sway.value * (1 - placed.value) },
        { rotate: `${rot.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  return (
    // entrance fade on the outer view; the position transforms live on the inner one
    <Animated.View
      entering={FadeIn.delay(order * 70).duration(250)}
      style={[styles.tileHost, { zIndex: inSlot ? 3 : 2 }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.tile, { width: size, height: size }, style]}>
        <Pressy silent onPress={onPress} style={styles.tileHit}>
          <AppText
            variant="title"
            style={{ fontSize: Math.round(size * 0.62), lineHeight: Math.round(size * 0.8), color: inSlot ? '#fff' : colors.text }}
          >
            {tile.ch}
          </AppText>
        </Pressy>
      </Animated.View>
    </Animated.View>
  );
}

/** A soft ring that spreads out of a slot the moment a tile lands in it. */
function Ripple({ color }: { color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(FLIGHT * 2 - 40, withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 0.7 * (1 - p.value),
    transform: [{ scale: 1 + p.value * 0.7 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: color }, style]} />;
}

/** A star that floats up off a letter as it turns green. */
function Sparkle({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 1 - p.value,
    transform: [{ translateY: -10 - p.value * 44 }, { scale: 0.7 + p.value * 0.5 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.sparkle, style]}>
      <AppText variant="heading">✨</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border, backgroundColor: '#fff' },
  picture: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: space.md,
    gap: space.sm,
    ...shadow,
  },
  board: { alignSelf: 'center' },
  slot: {
    position: 'absolute',
    top: 0,
    borderRadius: radius.sm,
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { position: 'absolute', borderRadius: radius.sm, backgroundColor: 'rgba(43,42,76,0.07)' },
  ripple: { ...StyleSheet.absoluteFill, borderRadius: radius.sm, borderWidth: 3 },
  sparkle: { position: 'absolute', top: 0 },
  tileHost: { position: 'absolute', left: 0, top: 0 },
  tile: { borderRadius: radius.sm, ...shadow },
  tileHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});