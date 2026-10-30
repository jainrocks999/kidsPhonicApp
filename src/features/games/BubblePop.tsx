import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
  ZoomOut,
  BounceIn,
} from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { patternSound, sfx } from '@/assets';
import { isSpeaking, play, playSfx, praise, stopVoice, subscribeSpeaking, tryAgain } from '@/services/audio';
import { shuffle } from '@/hooks/shuffle';
import { useT } from '@/i18n';
import { colors, fonts, levelColors, space } from '@/theme';
import type { GameProps } from './types';

const BUBBLE_COLORS = [colors.blue, colors.pink, colors.green, colors.purple, colors.primary];
const GOLD = '#FFC233';
/** Bubbles to find in each round — every round asks for a bit more. (Zyada clicks chahiye to yahin badlo.) */
const ROUND_NEED = [5, 6, 7, 8];
const MAX_ROUNDS = ROUND_NEED.length;
const ROUND_SECONDS = 30;
const LIGHTNING_SECONDS = 10;
const LOW_TIME = 10;
/** Bubbles on screen at once; a new one floats up whenever one pops or drifts away. */
const FIELD_COUNT = 7;
const LANES = 4;
/** Each round the bubbles float this much faster. */
const SPEED_UP = 0.12;
const BURST_PARTICLES = ['✨', '⭐', '💫', '🌟', '✨', '⭐', '💫', '🌟'];
const CONFETTI = ['🎉', '⭐', '🎈', '✨', '🌈', '🎊', '💖', '🌟', '🎉', '⭐', '🎈', '✨'];
/** A different sea friend hosts every round. */
const FRIENDS = ['🐙', '🐳', '🐢', '🐬'];
const display = (p: string, levelNumber: number) => (levelNumber === 1 ? p.toLowerCase() : p);

type Mood = 'idle' | 'happy' | 'oops' | 'party';
const MOOD_FACE: Record<Exclude<Mood, 'idle'>, string> = { happy: '😄', oops: '🙈', party: '🥳' };

type Bubble = {
  id: number;
  label: string;
  target: boolean;
  /** golden bubbles count double */
  golden: boolean;
  x: number;
  delay: number;
  /** ms to float from bottom to top */
  duration: number;
  size: number;
  popped: boolean;
};

export function BubblePop({ level, patterns, onFinish }: GameProps) {
  const t = useT();
  const { width, height } = useWindowDimensions();
  // One round per letter of the unit (up to 4), each a different letter.
  const targets = useMemo(() => shuffle(patterns).slice(0, MAX_ROUNDS), [patterns]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro');
  const [attempt, setAttempt] = useState(0); // time up → the same round again
  const [found, setFound] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [leaving, setLeaving] = useState(false); // round over → bubbles fade away
  const [fieldH, setFieldH] = useState(height * 0.65); // real play-field height (onLayout)
  const foundRef = useRef(0); // always-fresh count, safe for rapid taps
  const poppedIds = useRef(new Set<number>());
  const hits = useRef(0);
  const misses = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [toast, setToast] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [streak, setStreak] = useState(0);
  const [mood, setMood] = useState<Mood>('idle');
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundOver = useRef(false);
  const nextId = useRef(0);
  const target = targets[round];
  const need = ROUND_NEED[round];
  const friend = FRIENDS[round % FRIENDS.length];
  const shown = display(target ?? '', level.number);

  // Timeouts started by event handlers, all cleared when the game unmounts.
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
      if (moodTimer.current) clearTimeout(moodTimer.current);
      stopVoice(); // leaving the game silences any narration
    },
    [],
  );

  // Speaker button pulses while the voice channel is talking.
  const speaking = useSyncExternalStore(subscribeSpeaking, isSpeaking);
  const talk = useSharedValue(1);
  useEffect(() => {
    talk.set(
      speaking
        ? withRepeat(withSequence(withTiming(1.18, { duration: 280 }), withTiming(1, { duration: 280 })), -1)
        : withTiming(1, { duration: 150 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking]);
  const talkStyle = useAnimatedStyle(() => ({ transform: [{ scale: talk.value }] }));

  // Timer bar
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.set(withTiming(secondsLeft / ROUND_SECONDS, { duration: 900, easing: Easing.linear }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, progress.value) * 100}%` }));
  const low = phase === 'play' && secondsLeft <= LOW_TIME && secondsLeft > 0;

  const react = (m: Mood, ms = 1000) => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
    setMood(m);
    moodTimer.current = setTimeout(() => setMood('idle'), ms);
  };
  // Scared face whenever the mascot is idle and time is running out (no extra state needed).
  const face = mood !== 'idle' ? MOOD_FACE[mood] : low ? '😱' : friend;

  /** A fresh bubble: keeps at least two of the target letter on screen, sometimes a golden one. */
  const makeBubble = (field: Bubble[], delay: number): Bubble => {
    const live = field.filter((b) => !b.popped);
    const others = patterns.filter((p) => p !== target);
    const isTarget = !others.length || live.filter((b) => b.target).length < 2 || Math.random() < 0.4;
    const size = 80 + Math.round(Math.random() * 18); // mixed sizes feel playful
    // the emptiest lane, so bubbles don't stack on each other
    const used = Array.from({ length: LANES }, (_, l) => live.filter((b) => Math.round((b.x + b.size / 2) / (width / LANES) - 0.5) === l).length);
    const free = used.map((n, l) => ({ n, l, r: Math.random() })).sort((a, b) => a.n - b.n || a.r - b.r)[0].l;
    return {
      id: nextId.current++,
      label: isTarget ? target : others[Math.floor(Math.random() * others.length)],
      target: isTarget,
      golden: isTarget && Math.random() < 0.12,
      x: (free + 0.5) * (width / LANES) - size / 2 + (Math.random() * 16 - 8),
      delay,
      duration: (6500 + Math.random() * 2500) * (1 - SPEED_UP * round),
      size,
      popped: false,
    };
  };

  const say = () => play(patternSound(target), `${target}`);

  // Each round (or retry) opens with a big "find this letter" card, then the bubbles come.
  useEffect(() => {
    if (!target) return;
    roundOver.current = false;
    const intro = setTimeout(() => {
      setPhase('intro');
      setFound(0);
      foundRef.current = 0;
      poppedIds.current.clear();
      setToast(null);
      setCelebrate(false);
      setLeaving(false);
      setStreak(0);
      setMood('idle');
      setSecondsLeft(ROUND_SECONDS);
      progress.set(1);
      setBubbles([]);
      say();
    }, 0);
    const go = setTimeout(() => {
      setPhase('play');
      setBubbles(() => {
        let field: Bubble[] = [];
        for (let i = 0; i < FIELD_COUNT; i++) field = [...field, makeBubble(field, i * 600)];
        return field;
      });
    }, 1900);
    return () => {
      clearTimeout(intro);
      clearTimeout(go);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, attempt]);

  useEffect(() => {
    if (phase !== 'play') return;
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, [phase]);

  const endRound = (message: string, win = false) => {
    if (roundOver.current) return;
    roundOver.current = true;
    if (moodTimer.current) clearTimeout(moodTimer.current); // don't let a pending 😄 reset overwrite 🥳
    setPhase('over');
    setToast(message);
    setCelebrate(win);
    setMood(win ? 'party' : 'oops');
    setLeaving(true); // bubbles fade out smoothly, then get removed
    later(() => setBubbles([]), 350);
    later(() => {
      if (!win) setAttempt((a) => a + 1);
      else if (round + 1 < targets.length) setRound(round + 1);
      else onFinish(hits.current / Math.max(1, hits.current + misses.current));
    }, 1800);
  };

  useEffect(() => {
    if (secondsLeft === 0 && phase === 'play') {
      const id = setTimeout(() => {
        tryAgain();
        endRound(`⏰ ${t('bubble_game_time_up')} ${t('bubble_game_round_score', foundRef.current, need)}`);
      }, 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const pop = (b: Bubble) => {
    if (roundOver.current || poppedIds.current.has(b.id)) return;
    if (!b.target) {
      misses.current++;
      setStreak(0);
      react('oops');
      tryAgain();
      return;
    }
    poppedIds.current.add(b.id); // blocks double-taps on the same bubble
    const f = Math.min(need, foundRef.current + (b.golden ? 2 : 1));
    foundRef.current = f;
    hits.current++;
    if (f >= need) praise(); // correct sfx + random cheer
    else playSfx(sfx.correct);
    // Mark as popped (burst plays), then swap it for a new bubble.
    setBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, popped: true } : x)));
    later(() => {
      if (roundOver.current) return;
      setBubbles((bs) => {
        const rest = bs.filter((x) => x.id !== b.id);
        return [...rest, makeBubble(rest, 250)];
      });
    }, 550);
    setFound(f);
    setStreak((s) => s + 1);
    react('happy', 700);
    if (f >= need) {
      const fast = ROUND_SECONDS - secondsLeft <= LIGHTNING_SECONDS;
      endRound(
        `${fast ? `⚡ ${t('bubble_game_lightning_fast')} ` : ''}${t('bubble_game_round_complete_title')} ${t(
          'bubble_game_round_complete_subtitle',
          shown,
        )}`,
        true,
      );
    }
  };

  // A bubble that floats off the top is replaced by a new one, so the round never runs dry.
  const respawn = (id: number) =>
    setBubbles((bs) => {
      const gone = bs.find((b) => b.id === id);
      if (!gone || gone.popped) return bs;
      const rest = bs.filter((b) => b.id !== id);
      return [...rest, makeBubble(rest, 0)];
    });

  const stars = Array.from({ length: need }, (_, i) => (i < found ? '⭐' : '☆')).join(' ');

  return (
    <View style={styles.root}>
      <View style={styles.hud}>
        <Animated.View key={face} entering={BounceIn}>
          <AppText variant="title">{face}</AppText>
        </Animated.View>
        <AppText variant="heading">{t('bubble_game_find_letter', shown)}</AppText>
        <Animated.View style={talkStyle}>
          <IconButton icon="speaker" onPress={say} accessibilityLabel={t('bubble_game_listen_cd')} />
        </Animated.View>
      </View>

      <View style={styles.roundRow}>
        <AppText variant="caption">{t('bubble_game_round_label', round + 1, targets.length)}</AppText>
        <View style={styles.roundDots}>
          {targets.map((p, i) => (
            <View
              key={p}
              style={[
                styles.roundDot,
                i < round && { backgroundColor: colors.green, borderColor: colors.green },
                i === round && { borderColor: levelColors[level.number - 1], width: 22 },
              ]}
            />
          ))}
        </View>
      </View>

      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {stars}
      </AppText>

      <View style={styles.barRow}>
        <AppText variant="caption">🎯</AppText>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, barStyle, { backgroundColor: low ? colors.red : levelColors[level.number - 1] }]}
          />
        </View>
        <AppText variant="caption">⏱ {secondsLeft}s</AppText>
      </View>

      <View style={styles.field} pointerEvents="box-none" onLayout={(e) => setFieldH(e.nativeEvent.layout.height)}>
        <View style={styles.sea} pointerEvents="none">
          <AppText variant="title">🐠 🌊 🐚 🌊 🐟 🌊 🦀</AppText>
        </View>
        {phase === 'intro' && (
          <Animated.View key={`${round}-${attempt}`} entering={ZoomIn.springify().damping(14)} style={styles.intro} pointerEvents="none">
            <AppText style={styles.introFriend}>{friend}</AppText>
            <AppText variant="caption">{t('bubble_game_round_label', round + 1, targets.length)}</AppText>
            <View style={[styles.introBubble, { backgroundColor: levelColors[level.number - 1] }]}>
              <View style={styles.shine} />
              <AppText style={styles.introLetter}>{shown}</AppText>
            </View>
            <AppText variant="heading">{t('bubble_game_find_letter', shown)}</AppText>
            <AppText variant="heading">{Array.from({ length: need }, () => '🫧').join(' ')}</AppText>
          </Animated.View>
        )}
        {bubbles.map((b, i) => (
          <FloatingBubble
            key={b.id}
            bubble={b}
            fieldH={fieldH}
            leaving={leaving}
            color={b.golden ? GOLD : b.target ? levelColors[level.number - 1] : BUBBLE_COLORS[i % BUBBLE_COLORS.length]}
            label={display(b.label, level.number)}
            onPop={() => pop(b)}
            onExit={() => respawn(b.id)}
          />
        ))}
        {celebrate && <Confetti width={width} height={fieldH} />}

        {/* Overlays live on top of the field, so they never push the bubbles around. */}
        {streak >= 2 && (
          <Animated.View key={streak} entering={ZoomIn.springify()} exiting={ZoomOut} style={styles.streak} pointerEvents="none">
            <AppText variant="heading" style={{ color: '#fff' }}>
              🔥 x{streak}
            </AppText>
          </Animated.View>
        )}
        {toast && (
          <Animated.View entering={ZoomIn.springify()} style={styles.toast} pointerEvents="none">
            <AppText variant="heading" style={{ textAlign: 'center' }}>
              {toast}
            </AppText>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function FloatingBubble({
  bubble,
  fieldH,
  leaving,
  color,
  label,
  onPop,
  onExit,
}: {
  bubble: Bubble;
  fieldH: number;
  leaving: boolean;
  color: string;
  label: string;
  onPop: () => void;
  onExit: () => void;
}) {
  const { size } = bubble;
  const y = useSharedValue(fieldH); // starts just below the visible field
  const wobble = useSharedValue(0);
  const shake = useSharedValue(0);
  const pop = useSharedValue(0); // 0 → 1 while popping
  const fade = useSharedValue(0); // 0 → 1 when the round ends

  useEffect(() => {
    const { duration } = bubble;
    const timer = setTimeout(() => {
      y.set(withTiming(-size - 20, { duration, easing: Easing.linear }));
      wobble.set(withRepeat(withTiming(1, { duration: 750 + (bubble.id % 5) * 120 }), -1, true));
    }, bubble.delay);
    const exit = setTimeout(onExit, bubble.delay + duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(exit);
      cancelAnimation(y);
      cancelAnimation(wobble);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubble.id]);

  useEffect(() => {
    if (bubble.popped) pop.set(withTiming(1, { duration: 220 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubble.popped]);

  useEffect(() => {
    if (leaving) fade.set(withTiming(1, { duration: 300 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  // Position + wobble only. The pop/fade scale lives on an inner view, so it never fights with
  // the float (and the burst isn't squashed by it).
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: (wobble.value - 0.5) * 16 + shake.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - pop.value - fade.value),
    transform: [{ scale: 1 + pop.value * 0.35 - fade.value * 0.4 }],
  }));

  const press = () => {
    if (bubble.popped || leaving) return;
    if (!bubble.target) {
      // silly wiggle for a wrong bubble
      shake.set(
        withSequence(
          withTiming(-12, { duration: 50 }),
          withRepeat(withTiming(12, { duration: 90 }), 5, true),
          withTiming(0, { duration: 50 }),
        ),
      );
    }
    onPop();
  };

  return (
    <Animated.View style={[styles.bubbleWrap, { left: bubble.x, width: size, height: size }, style]}>
      <Animated.View style={bodyStyle} pointerEvents={bubble.popped || leaving ? 'none' : 'auto'}>
        <Pressy
          silent
          onPress={press}
          style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}
        >
          <View style={styles.shine} pointerEvents="none" />
          <View style={styles.shineSmall} pointerEvents="none" />
          <AppText variant="title" style={{ color: '#fff' }}>
            {label}
          </AppText>
          {bubble.golden && <AppText style={styles.goldStar}>⭐</AppText>}
        </Pressy>
      </Animated.View>
      {bubble.popped && <Burst size={size} />}
    </Animated.View>
  );
}

/** Little stars fly outwards when a bubble pops. */
function Burst({ size }: { size: number }) {
  return (
    <View style={[styles.burst, { width: size, height: size }]} pointerEvents="none">
      {BURST_PARTICLES.map((emoji, i) => (
        <Particle key={i} emoji={emoji} angle={(i / BURST_PARTICLES.length) * Math.PI * 2} reach={size * 0.9} />
      ))}
    </View>
  );
}

function Particle({ emoji, angle, reach }: { emoji: string; angle: number; reach: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(angle) * reach * p.value },
      { translateY: Math.sin(angle) * reach * p.value },
      { scale: 0.6 + p.value * 0.8 },
    ],
  }));
  return (
    <Animated.View style={[styles.particle, style]}>
      <AppText variant="heading">{emoji}</AppText>
    </Animated.View>
  );
}

/** Confetti shower for a finished round. */
function Confetti({ width, height }: { width: number; height: number }) {
  // random once per shower (lazy state, not render)
  const [pieces] = useState(() =>
    CONFETTI.map((emoji, i) => ({
      emoji,
      x: (i / CONFETTI.length) * (width - 40) + Math.random() * 20,
      delay: Math.random() * 400,
      duration: 1300 + Math.random() * 700,
    })),
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((c, i) => (
        <ConfettiPiece key={i} {...c} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  emoji,
  x,
  delay,
  duration,
  height,
}: {
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  height: number;
}) {
  const y = useSharedValue(-40);
  const spin = useSharedValue(0);
  useEffect(() => {
    y.set(withDelay(delay, withTiming(height, { duration, easing: Easing.in(Easing.quad) })));
    spin.set(withDelay(delay, withTiming(360, { duration })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${spin.value}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: 0 }, style]}>
      <AppText variant="title">{emoji}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.md },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.xs,
  },
  barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  streak: {
    position: 'absolute',
    top: space.sm,
    right: space.md,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.orange,
    zIndex: 5,
  },
  roundRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  roundDots: { flexDirection: 'row', gap: 5 },
  roundDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: '#fff' },
  field: { flex: 1, overflow: 'hidden' },
  intro: {
    alignSelf: 'center',
    marginTop: space.lg,
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 8,
    borderBottomColor: colors.border,
  },
  introFriend: { fontSize: 52, lineHeight: 62 },
  introBubble: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  introLetter: { fontFamily: fonts.bold, fontSize: 58, lineHeight: 70, color: '#fff' },
  goldStar: { position: 'absolute', top: 4, right: 10, fontSize: 18, lineHeight: 22 },
  sea: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', opacity: 0.5 },
  toast: {
    position: 'absolute',
    top: space.sm,
    left: space.lg,
    right: space.lg,
    padding: space.md,
    borderRadius: 20,
    backgroundColor: colors.yellow,
    zIndex: 6,
  },
  bubbleWrap: { position: 'absolute', top: 0 },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  // glossy "soap bubble" highlights
  shine: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 22,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-30deg' }],
  },
  shineSmall: {
    position: 'absolute',
    top: 24,
    left: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  burst: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
});