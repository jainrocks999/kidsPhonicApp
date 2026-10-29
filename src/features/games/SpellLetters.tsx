import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { sfx } from '@/assets';
import { play, playSfx, tryAgain } from '@/services/audio';
import type { Word } from '@/data/types';
import { shuffle } from '@/hooks/shuffle';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import { useRounds } from './useRounds';
import type { GameProps } from './types';

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
      progress={`${index + 1}/${total}`}
      accent={levelColors[level.number - 1]}
      onSpelled={() => answer(true)}
    />
  );
}

function SpellRound({ item, progress, accent, onSpelled }: { item: Word; progress: string; accent: string; onSpelled: () => void }) {
  const target = item.word.toLowerCase();
  const [tiles] = useState(() => shuffle(target.split('').map((ch, i) => ({ ch, id: i }))));
  const [used, setUsed] = useState<number[]>([]);

  useEffect(() => {
    play(undefined, item.word);
  }, [item]);

  const tap = (tile: { ch: string; id: number }) => {
    const expected = target[used.length];
    if (tile.ch !== expected) {
      tryAgain();
      return;
    }
    playSfx(sfx.click);
    const next = [...used, tile.id];
    setUsed(next);
    if (next.length === target.length) onSpelled();
  };

  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {progress}
      </AppText>
      <View style={styles.picture}>
        <WordPicture word={item} size={140} />
        <IconButton icon="speaker" size={40} onPress={() => play(undefined, item.word)} />
      </View>
      <View style={styles.slots}>
        {target.split('').map((ch, i) => (
          <View key={i} style={[styles.slot, i < used.length && { borderColor: accent }]}>
            <AppText variant="title" style={{ color: accent }}>
              {i < used.length ? ch : ''}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.tiles}>
        {tiles.map((tile) =>
          used.includes(tile.id) ? (
            <View key={tile.id} style={[styles.tile, { opacity: 0.2 }]} />
          ) : (
            <Pressy key={tile.id} silent onPress={() => tap(tile)} style={styles.tile}>
              <AppText variant="title">{tile.ch}</AppText>
            </Pressy>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  picture: { alignSelf: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, ...shadow },
  slots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  slot: { width: 48, height: 58, borderBottomWidth: 4, borderColor: colors.locked, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  tile: { width: 58, height: 58, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
});
