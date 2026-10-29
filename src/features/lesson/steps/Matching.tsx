import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { play, playSfx, tryAgain } from '@/services/audio';
import { sfx } from '@/assets';
import { shuffle } from '@/hooks/shuffle';
import { colors, radius, shadow, space } from '@/theme';
import type { Word } from '@/data/types';

/**
 * Tap a picture, then its word (or the other way round). Shared by the lesson
 * "Matching" step and the "Drag words" mini game.
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
  const [selPic, setSelPic] = useState<string | null>(null);
  const [selWord, setSelWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const mistakes = useRef(0);

  const attempt = (pic: string | null, word: string | null) => {
    if (!pic || !word) return;
    if (pic === word) {
      playSfx(sfx.correct);
      play(undefined, word);
      const next = new Set(matched).add(word);
      setMatched(next);
      if (next.size === words.length) {
        setTimeout(() => onDone(Math.max(0, 1 - mistakes.current / words.length)), 600);
      }
    } else {
      mistakes.current++;
      tryAgain();
    }
    setSelPic(null);
    setSelWord(null);
  };

  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {guide}
      </AppText>
      <View style={styles.cols}>
        <View style={styles.col}>
          {pics.map((w) => {
            const done = matched.has(w.word);
            return (
              <Pressy
                key={w.word}
                disabled={done}
                onPress={() => (setSelPic(w.word), attempt(w.word, selWord))}
                style={[styles.cell, selPic === w.word && { borderColor: accent }, done && styles.done]}>
                <WordPicture word={w} size={64} />
              </Pressy>
            );
          })}
        </View>
        <View style={styles.col}>
          {labels.map((w) => {
            const done = matched.has(w.word);
            return (
              <Pressy
                key={w.word}
                disabled={done}
                onPress={() => (setSelWord(w.word), attempt(selPic, w.word))}
                style={[styles.cell, selWord === w.word && { borderColor: accent }, done && styles.done]}>
                <AppText variant="heading">{w.word}</AppText>
              </Pressy>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.md, justifyContent: 'center' },
  cols: { flexDirection: 'row', gap: space.lg },
  col: { flex: 1, gap: space.md },
  cell: {
    height: 84,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  done: { backgroundColor: '#E3F6E6', borderColor: colors.green, opacity: 0.6 },
});
