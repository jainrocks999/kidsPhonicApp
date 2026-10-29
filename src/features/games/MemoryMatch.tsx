import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FlipInEasyY } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { play, playSfx } from '@/services/audio';
import { sfx } from '@/assets';
import { sample, shuffle } from '@/hooks/shuffle';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import type { GameProps } from './types';

const PAIRS = 6;
type Card = { key: string; word: string; face: 'pic' | 'text' };

export function MemoryMatch({ level, words, onFinish }: GameProps) {
  const picked = useMemo(() => sample(words, PAIRS), [words]);
  const cards = useMemo<Card[]>(
    () => shuffle(picked.flatMap((w) => [{ key: `${w.word}-p`, word: w.word, face: 'pic' as const }, { key: `${w.word}-t`, word: w.word, face: 'text' as const }])),
    [picked],
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const flips = useRef(0);
  const accent = levelColors[level.number - 1];

  const flip = (c: Card) => {
    if (open.length === 2 || open.includes(c.key) || matched.has(c.word)) return;
    const now = [...open, c.key];
    setOpen(now);
    if (now.length < 2) return;
    flips.current++;
    const [a, b] = now.map((k) => cards.find((x) => x.key === k)!);
    if (a.word === b.word) {
      playSfx(sfx.correct);
      play(undefined, a.word);
      const m = new Set(matched).add(a.word);
      setMatched(m);
      setOpen([]);
      if (m.size === picked.length) setTimeout(() => onFinish(Math.min(1, (picked.length * 1.5) / flips.current)), 600);
    } else {
      setTimeout(() => setOpen([]), 900);
    }
  };

  return (
    <View style={styles.grid}>
      {cards.map((c) => {
        const shown = open.includes(c.key) || matched.has(c.word);
        const w = picked.find((p) => p.word === c.word)!;
        return (
          <Pressy key={c.key} silent onPress={() => flip(c)} style={[styles.card, shown ? styles.front : { backgroundColor: accent }, matched.has(c.word) && { opacity: 0.55 }]}>
            {shown ? (
              <Animated.View entering={FlipInEasyY}>
                {c.face === 'pic' ? <WordPicture word={w} size={64} /> : <AppText variant="heading">{c.word}</AppText>}
              </Animated.View>
            ) : (
              <AppText style={{ fontSize: 32, color: '#fff' }}>?</AppText>
            )}
          </Pressy>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: space.sm, padding: space.md },
  card: { width: '30%', aspectRatio: 0.85, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', ...shadow },
  front: { backgroundColor: colors.surface },
});
