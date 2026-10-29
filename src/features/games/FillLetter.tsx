import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { play } from '@/services/audio';
import { sample, shuffle } from '@/hooks/shuffle';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import { useRounds } from './useRounds';
import type { GameProps } from './types';
import type { Word } from '@/data/types';

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
  const pool = useMemo(() => words.filter((w) => !/\s|-/.test(w.word)), [words]);
  const { item, index, total, answer } = useRounds(pool, onFinish);
  const [before, missing, after] = missingChunk(item, patterns);
  const options = useMemo(() => {
    const others = [...new Set(patterns.map((p) => p.toLowerCase()))].filter((p) => p !== missing);
    return shuffle([missing, ...sample(others, 2)]);
  }, [missing, patterns]);
  const accent = levelColors[level.number - 1];

  useEffect(() => {
    play(undefined, item.word);
  }, [item]);

  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {index + 1}/{total}
      </AppText>
      <View style={styles.picture}>
        <WordPicture word={item} size={150} />
      </View>
      <AppText variant="huge" style={{ textAlign: 'center', fontSize: 56, lineHeight: 70 }}>
        {before}
        <AppText variant="huge" style={{ fontSize: 56, color: accent }}>
          {'_'.repeat(Math.max(1, missing.length))}
        </AppText>
        {after}
      </AppText>
      <View style={styles.options}>
        {options.map((o) => (
          <Pressy key={o} silent onPress={() => answer(o === missing)} style={styles.option}>
            <AppText variant="title" style={{ color: accent }}>
              {o}
            </AppText>
          </Pressy>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  picture: { alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, ...shadow },
  options: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
  option: { minWidth: 84, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, alignItems: 'center', ...shadow },
});
