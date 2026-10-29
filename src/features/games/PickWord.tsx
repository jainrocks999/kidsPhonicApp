import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { sample, shuffle } from '@/hooks/shuffle';
import { colors, radius, shadow, space } from '@/theme';
import { useRounds } from './useRounds';
import type { GameProps } from './types';

export function PickWord({ words, onFinish }: GameProps) {
  const { item, index, total, answer } = useRounds(words, onFinish);
  const options = useMemo(
    () => shuffle([item, ...sample(words.filter((w) => w.word !== item.word), 2)]),
    [item, words],
  );
  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {index + 1}/{total}
      </AppText>
      <View style={styles.picture}>
        <WordPicture word={item} size={180} />
      </View>
      <View style={{ gap: space.md }}>
        {options.map((w) => (
          <Pressy key={w.word} silent onPress={() => answer(w.word === item.word)} style={styles.option}>
            <AppText variant="title">{w.word}</AppText>
          </Pressy>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  picture: { alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, ...shadow },
  option: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: space.md, alignItems: 'center', ...shadow },
});
