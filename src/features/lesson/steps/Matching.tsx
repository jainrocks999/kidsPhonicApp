import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { WordPicture } from '@/components/WordPicture';
import { click, play, playSfx, tryAgain } from '@/services/audio';
import { sfx } from '@/assets';
import { shuffle } from '@/hooks/shuffle';
import { colors, fonts, radius, shadow, space, unitColors, unitDark } from '@/theme';
import type { Word } from '@/data/types';
import { StepGuide } from '../fx';

type Side = 'pic' | 'word';
type Pt = { x: number; y: number };
type Hit = { side: Side; index: number };
type CardState = 'idle' | 'active' | 'matched' | 'wrong';

/** Space between the two columns — the lines curve across it. */
const COL_GAP = 84;
const ROW_GAP = 14;
const DOT = 11;
const LINE = 9;
/** Below this the finger "tapped" instead of drawing a line. */
const TAP_SLOP = 12;

/**
 * Draw a line from a picture to its word (or the other way round); tapping one side and then the
 * other works too. Every picture owns a candy color — its plug, its line and, once matched, its word
 * card all wear it. Shared by the lesson "Matching" step and the "Drag words" mini game.
 */
export function MatchPairs({
  words,
  guide,
  onDone,
  accent = colors.blue,
}: {
  words: Word[];
  guide: string;
  onDone: (score: number) => void;
  accent?: string;
}) {
  const pics = useMemo(() => shuffle(words), [words]);
  const labels = useMemo(() => shuffle(words), [words]);
  const [width, setWidth] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Hit | null>(null);
  const [drag, setDrag] = useState<{ from: Hit; start: Pt; to: Pt } | null>(null);
  const [wrong, setWrong] = useState<{ pic: number; word: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const allDone = matched.size === words.length;

  useEffect(() => {
    if (!wrong) return;
    const id = setTimeout(() => setWrong(null), 650);
    return () => clearTimeout(id);
  }, [wrong]);

  useEffect(() => {
    if (!allDone) return;
    const id = setTimeout(() => onDone(Math.max(0, 1 - mistakes / words.length)), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const cellH = words.length > 4 ? 72 : 88;
  const colW = (width - COL_GAP) / 2;
  const height = words.length * cellH + (words.length - 1) * ROW_GAP;
  const wordOf = (h: Hit) => (h.side === 'pic' ? pics : labels)[h.index].word;
  const picIndex = (word: string) => pics.findIndex((p) => p.word === word);
  const colorOf = (word: string) => unitColors[picIndex(word) % unitColors.length];
  const darkOf = (word: string) => unitDark[picIndex(word) % unitDark.length];

  /** The plug on a card's inner edge, where its line starts. */
  const anchor = ({ side, index }: Hit): Pt => ({
    x: side === 'pic' ? colW : colW + COL_GAP,
    y: index * (cellH + ROW_GAP) + cellH / 2,
  });

  /** Which card is under (x, y)? `loose` also accepts the gaps around it — for forgiving drops. */
  const cellAt = ({ x, y }: Pt, loose = false): Hit | null => {
    const edge = loose ? COL_GAP / 2 : DOT * 2;
    const side: Side | null = x < colW + edge ? 'pic' : x > colW + COL_GAP - edge ? 'word' : null;
    if (!side) return null;
    const pitch = cellH + ROW_GAP;
    const index = Math.min(words.length - 1, Math.max(0, Math.round((y - cellH / 2) / pitch)));
    const off = Math.abs(y - (index * pitch + cellH / 2));
    return off <= (loose ? pitch / 2 + ROW_GAP : cellH / 2) ? { side, index } : null;
  };

  const attempt = (a: Hit, b: Hit) => {
    setSelected(null);
    const pic = a.side === 'pic' ? a : b;
    const word = a.side === 'pic' ? b : a;
    const w = wordOf(pic);
    if (w === wordOf(word)) {
      playSfx(sfx.correct);
      play(undefined, w);
      setMatched(new Set(matched).add(w));
    } else {
      setMistakes(mistakes + 1);
      setWrong({ pic: pic.index, word: word.index });
      tryAgain();
    }
  };

  const grant = (p: Pt) => {
    const hit = cellAt(p);
    if (!hit || matched.has(wordOf(hit))) return;
    click();
    // kids who can't read yet hear what they picked up
    play(undefined, wordOf(hit));
    setDrag({ from: hit, start: p, to: p });
  };

  const release = (p: Pt) => {
    if (!drag) return;
    setDrag(null);
    const { from, start } = drag;
    if (Math.hypot(p.x - start.x, p.y - start.y) < TAP_SLOP) {
      // tap: pick this one, or finish a pair if the other side is already picked
      if (selected && selected.side !== from.side) attempt(selected, from);
      else setSelected(selected?.side === from.side && selected.index === from.index ? null : from);
      return;
    }
    const target = cellAt(p, true);
    if (target && target.side !== from.side && !matched.has(wordOf(target))) attempt(from, target);
    else setSelected(null);
  };

  // Rebuilt every render on purpose: the responder reads its handlers from the latest props,
  // so release() always sees the current drag and selection.
  const at = (e: GestureResponderEvent): Pt => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => grant(at(e)),
    onPanResponderMove: (e) => setDrag((d) => d && { ...d, to: at(e) }),
    onPanResponderRelease: (e) => release(at(e)),
    onPanResponderTerminate: () => setDrag(null),
  });

  const active = drag?.from ?? selected;
  const stateOf = (side: Side, index: number, word: string): CardState =>
    matched.has(word)
      ? 'matched'
      : wrong?.[side] === index
      ? 'wrong'
      : active?.side === side && active.index === index
      ? 'active'
      : 'idle';

  /** S-curve leaving each plug sideways, so lines never cut through the cards. */
  const curve = (a: Pt, aSide: Side, b: Pt) => {
    const k = COL_GAP * 0.7;
    const dir = aSide === 'pic' ? 1 : -1;
    return `M${a.x} ${a.y} C${a.x + k * dir} ${a.y} ${b.x - k * dir} ${b.y} ${b.x} ${b.y}`;
  };

  /** Thick candy line with a white rim so it pops off the background. */
  const rope = (d: string, color: string, key: string) => [
    <Path key={`${key}-rim`} d={d} stroke="#fff" strokeWidth={LINE + 6} strokeLinecap="round" fill="none" />,
    <Path key={key} d={d} stroke={color} strokeWidth={LINE} strokeLinecap="round" fill="none" />,
  ];

  const plug = (side: Side, index: number) => {
    const p = anchor({ side, index });
    const w = wordOf({ side, index });
    const state = stateOf(side, index, w);
    const fill =
      state === 'matched' || (side === 'pic' && state !== 'wrong')
        ? colorOf(w)
        : state === 'wrong'
        ? colors.red
        : state === 'active'
        ? accent
        : '#fff';
    return [
      <Circle key={`${side}${index}`} cx={p.x} cy={p.y} r={DOT} fill={fill} stroke="#fff" strokeWidth={4} />,
      fill === '#fff' && <Circle key={`${side}${index}-in`} cx={p.x} cy={p.y} r={DOT - 4} fill={colors.border} />,
    ];
  };

  return (
    <View style={styles.root}>
      <StepGuide emoji="🔗" text={guide} />

      <View style={styles.progress}>
        {words.map((w, i) => (
          <View key={w.word} style={styles.progressSlot}>
            {i < matched.size ? (
              <Animated.Text entering={ZoomIn.springify().damping(14)} style={styles.progressStar}>
                ⭐
              </Animated.Text>
            ) : (
              <AppText style={[styles.progressStar, styles.progressOff]}>⭐</AppText>
            )}
          </View>
        ))}
      </View>

      <View
        style={[styles.board, { height }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        pointerEvents="box-only"
        {...pan.panHandlers}>
        <View style={styles.col}>
          {pics.map((w, i) => (
            <Card key={w.word} enter="left" delay={i * 70} state={stateOf('pic', i, w.word)} height={cellH}>
              <View style={[styles.picCard, { backgroundColor: tint(colorOf(w.word)), borderBottomColor: darkOf(w.word) }]}>
                <WordPicture word={w} size={cellH - 22} />
              </View>
            </Card>
          ))}
        </View>
        <View style={styles.col}>
          {labels.map((w, i) => {
            const state = stateOf('word', i, w.word);
            const done = state === 'matched';
            return (
              <Card key={w.word} enter="right" delay={i * 70} state={state} height={cellH}>
                <View
                  style={[
                    styles.wordCard,
                    done && { backgroundColor: colorOf(w.word), borderBottomColor: darkOf(w.word) },
                    state === 'active' && { borderColor: accent },
                    state === 'wrong' && styles.wrongCard,
                  ]}>
                  <AppText style={[styles.word, done && styles.wordDone]} numberOfLines={1} adjustsFontSizeToFit>
                    {w.word}
                  </AppText>
                </View>
              </Card>
            );
          })}
        </View>

        {width > 0 && (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {pics.map((w, i) =>
              matched.has(w.word)
                ? rope(curve(anchor({ side: 'pic', index: i }), 'pic', anchor({ side: 'word', index: labels.findIndex((l) => l.word === w.word) })), colorOf(w.word), `m${i}`)
                : null,
            )}
            {wrong && rope(curve(anchor({ side: 'pic', index: wrong.pic }), 'pic', anchor({ side: 'word', index: wrong.word })), colors.red, 'wrong')}
            {drag && rope(curve(anchor(drag.from), drag.from.side, drag.to), drag.from.side === 'pic' ? colorOf(wordOf(drag.from)) : accent, 'drag')}
            {pics.map((_, i) => plug('pic', i))}
            {labels.map((_, i) => plug('word', i))}
            {drag && <Circle cx={drag.to.x} cy={drag.to.y} r={DOT + 3} fill="#fff" stroke={colors.border} strokeWidth={3} />}
          </Svg>
        )}
      </View>
    </View>
  );
}

/** Opaque pastel of a theme color (a translucent fill would show the Android shadow through it). */
function tint(hex: string, amount = 0.2) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * amount);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

/** Slides in from its side; a soft lift when picked, a small pop when matched, a wiggle when wrong. */
function Card({
  state,
  enter,
  delay,
  height,
  children,
}: {
  state: CardState;
  enter: 'left' | 'right';
  delay: number;
  height: number;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (state === 'active') scale.set(withTiming(1.05, { duration: 120 }));
    else if (state === 'matched') scale.set(withSequence(withTiming(1.08, { duration: 120 }), withSpring(1, { damping: 14 })));
    else if (state === 'wrong') {
      scale.set(withTiming(1, { duration: 80 }));
      shake.set(withSequence(withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 })));
    } else scale.set(withTiming(1, { duration: 120 }));
  }, [state, scale, shake]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { scale: scale.value }] }));
  const entering = (enter === 'left' ? FadeInLeft : FadeInRight).delay(delay).duration(300);

  return (
    <Animated.View entering={entering} style={{ height }}>
      <Animated.View style={[styles.card, anim]}>{children}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md, justifyContent: 'center' },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  progressSlot: { width: 30, alignItems: 'center' },
  progressStar: { fontSize: 24, lineHeight: 30 },
  progressOff: { opacity: 0.2 },
  board: { flexDirection: 'row', gap: COL_GAP, marginHorizontal: space.xs },
  col: { flex: 1, gap: ROW_GAP },
  card: { flex: 1 },
  picCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 7,
    ...shadow,
  },
  wordCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 7,
    borderBottomColor: colors.border,
    ...shadow,
  },
  wrongCard: { borderColor: colors.red, borderBottomColor: '#D63A5A', backgroundColor: '#FFE8EC' },
  word: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: colors.text },
  wordDone: { color: '#fff' },
});
