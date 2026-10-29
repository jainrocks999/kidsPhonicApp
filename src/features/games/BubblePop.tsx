import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { patternSound, sfx } from '@/assets';
import { play, playSfx, tryAgain } from '@/services/audio';
import { shuffle } from '@/hooks/shuffle';
import { useT } from '@/i18n';
import { colors, levelColors, space } from '@/theme';
import type { GameProps } from './types';

const BUBBLE_COLORS = [colors.blue, colors.pink, colors.green, colors.purple, colors.primary];
const PER_ROUND = 3; // targets to pop per round
const ROUND_COUNT = 3;
const ROUND_SECONDS = 30;
const LIGHTNING_SECONDS = 10;
const display = (p: string, levelNumber: number) => (levelNumber === 1 ? p.toLowerCase() : p);

type Bubble = { id: number; label: string; target: boolean; x: number; delay: number };

export function BubblePop({ level, patterns, onFinish }: GameProps) {
  const t = useT();
  const { width, height } = useWindowDimensions();
  const order = useMemo(() => shuffle(patterns).slice(0, ROUND_COUNT), [patterns]);
  const [round, setRound] = useState(0);
  const [found, setFound] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const misses = useRef(0);
  const foundTotal = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [toast, setToast] = useState<string | null>(null);
  const roundOver = useRef(false);
  const target = order[round];
  const nextId = useRef(0);

  const makeBubbles = () => {
    const others = patterns.filter((p) => p !== target);
    const labels = shuffle([...Array(PER_ROUND).fill(target), ...shuffle(others).concat(others).slice(0, 5)]);
    const cols = 4;
    return labels.map((label, i) => ({
      id: nextId.current++,
      label,
      target: label === target,
      x: ((i % cols) + 0.5) * (width / cols) - 40 + (Math.random() * 20 - 10),
      delay: i * 700,
    }));
  };

  const say = () => play(patternSound(target), `${target}`);

  useEffect(() => {
    if (!target) return;
    const id = setTimeout(() => {
      roundOver.current = false;
      setFound(0);
      setToast(null);
      setSecondsLeft(ROUND_SECONDS);
      setBubbles(makeBubbles());
      say();
    }, 300);
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(id);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const endRound = (message: string) => {
    if (roundOver.current) return;
    roundOver.current = true;
    setToast(message);
    setBubbles([]);
    setTimeout(() => {
      if (round + 1 >= order.length) {
        const accuracy = 1 - misses.current / (PER_ROUND * order.length + misses.current);
        onFinish(Math.max(0, (foundTotal.current / (PER_ROUND * order.length)) * accuracy));
      } else setRound(round + 1);
    }, 1400);
  };

  useEffect(() => {
    if (secondsLeft === 0 && bubbles.length) {
      const id = setTimeout(() => {
        tryAgain();
        endRound(`⏰ ${t('bubble_game_time_up')} ${t('bubble_game_round_score', found, PER_ROUND)}`);
      }, 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const pop = (b: Bubble) => {
    if (roundOver.current) return;
    if (!b.target) {
      misses.current++;
      tryAgain();
      return;
    }
    playSfx(sfx.correct);
    setBubbles((bs) => bs.filter((x) => x.id !== b.id));
    const f = found + 1;
    foundTotal.current++;
    setFound(f);
    if (f >= PER_ROUND) {
      const fast = ROUND_SECONDS - secondsLeft <= LIGHTNING_SECONDS;
      endRound(
        `${fast ? `⚡ ${t('bubble_game_lightning_fast')} ` : ''}${t('bubble_game_round_complete_title')} ${t(
          'bubble_game_round_complete_subtitle',
          display(target, level.number),
        )}`,
      );
    }
  };

  // A popped-out bubble respawns when it floats off the top so the round can't soft-lock.
  const respawn = (id: number) =>
    setBubbles((bs) => bs.map((b) => (b.id === id ? { ...b, id: nextId.current++, delay: 0 } : b)));

  return (
    <View style={styles.root}>
      <View style={styles.hud}>
        <AppText variant="heading">
          {t('bubble_game_find_letter', display(target ?? '', level.number))} · {found}/{PER_ROUND}
        </AppText>
        <IconButton icon="speaker" onPress={say} accessibilityLabel={t('bubble_game_listen_cd')} />
      </View>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {t('bubble_game_round_label', round + 1, order.length)} · ⏱ {secondsLeft}s
      </AppText>
      {toast && (
        <Animated.View entering={ZoomIn} style={styles.toast}>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {toast}
          </AppText>
        </Animated.View>
      )}
      <View style={styles.field}>
        {bubbles.map((b, i) => (
          <FloatingBubble
            key={b.id}
            bubble={b}
            height={height * 0.65}
            color={b.target ? levelColors[level.number - 1] : BUBBLE_COLORS[i % BUBBLE_COLORS.length]}
            label={display(b.label, level.number)}
            onPop={() => pop(b)}
            onExit={() => respawn(b.id)}
          />
        ))}
      </View>
    </View>
  );
}

function FloatingBubble({
  bubble,
  height,
  color,
  label,
  onPop,
  onExit,
}: {
  bubble: Bubble;
  height: number;
  color: string;
  label: string;
  onPop: () => void;
  onExit: () => void;
}) {
  const y = useSharedValue(height);
  const wobble = useSharedValue(0);
  useEffect(() => {
    const duration = 6500 + Math.random() * 2500;
    const timer = setTimeout(() => {
      y.set(withTiming(-100, { duration, easing: Easing.linear }));
      wobble.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
    }, bubble.delay);
    const exit = setTimeout(onExit, bubble.delay + duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(exit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubble.id]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: (wobble.value - 0.5) * 16 }],
  }));
  return (
    <Animated.View exiting={ZoomOut} style={[styles.bubbleWrap, { left: bubble.x }, style]}>
      <Pressy silent onPress={onPop} style={[styles.bubble, { backgroundColor: color }]}>
        <AppText variant="title" style={{ color: '#fff' }}>
          {label}
        </AppText>
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.md },
  field: { flex: 1, overflow: 'hidden' },
  toast: { marginHorizontal: space.lg, marginTop: space.sm, padding: space.md, borderRadius: 20, backgroundColor: colors.yellow },
  bubbleWrap: { position: 'absolute', top: 0 },
  bubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
});
