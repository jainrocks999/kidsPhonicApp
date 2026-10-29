import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { RainbowText } from '@/components/RainbowText';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { play, speak } from '@/services/audio';
import { useT } from '@/i18n';
import { colors, levelColors, levelInk, radius, shadow, space } from '@/theme';
import { Bouncy, KaraokeLine, SoundWaves, StepGuide } from '../fx';
import type { StepProps } from '../types';

/** "The Aa Story": a title page, then one page per word — "A is for apple!". */
export function LetterStory({ lessonRef, onReady }: StepProps) {
  const t = useT();
  const { lesson, level } = lessonRef;
  const [page, setPage] = useState(-1);
  const [dir, setDir] = useState<1 | -1>(1);
  /** Which chunk is being read right now (-1 idle, chunks.length = all read). */
  const [reading, setReading] = useState(-1);
  const runId = useRef(0);
  const accent = levelColors[level.number - 1];
  const word = page >= 0 ? lesson.words[page] : null;
  const letter = lesson.displayLetter.charAt(0).toUpperCase();
  const last = lesson.words.length - 1;

  // what's on the page, split the same way it's narrated
  const chunks = word ? [`${letter} is for`, `${word.word}!`] : [t('story_letter_title', letter, letter.toLowerCase())];

  const narrate = async () => {
    const my = ++runId.current;
    if (word && page >= 0) {
      setReading(0);
      await speak(`${letter} is for`, { rate: 0.85 });
      if (my !== runId.current) return;
      setReading(1);
      await play(lessonAudio.vocab(lessonRef, page), word.word);
    } else {
      setReading(0);
      await speak(`The ${letter} story`);
    }
    if (my !== runId.current) return;
    setReading(chunks.length);
    if (page === last) onReady();
  };

  useEffect(() => {
    const id = setTimeout(narrate, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const go = (d: 1 | -1) => {
    const n = page + d;
    if (n < -1 || n > last) return;
    setDir(d);
    setReading(-1);
    setPage(n);
  };

  const busy = reading >= 0 && reading < chunks.length;

  return (
    <View style={styles.root}>
      <StepGuide emoji="📖" text={t('step_guide_story')} />
      <View style={styles.row}>
        <View style={{ opacity: page === -1 ? 0.35 : 1 }}>
          <IconButton icon="prev" color={accent} onPress={() => go(-1)} accessibilityLabel={t('slide_previous_cd')} />
        </View>
        <Animated.View key={page} entering={(dir === 1 ? FadeInRight : FadeInLeft).springify().damping(15)} style={{ flex: 1 }}>
          <Pressy silent onPress={narrate} style={[styles.page, { borderBottomColor: accent }]} accessibilityLabel={t('story_audio_cd')}>
            <SoundWaves active={word ? reading === 1 : busy} size={200} color={accent} />
            <Bouncy active={word ? reading === 1 : busy} popKey={page}>
              {word ? (
                <WordPicture word={word} size={170} />
              ) : (
                <RainbowText text={lesson.displayLetter} size={110} palette={levelInk[level.number - 1]} />
              )}
            </Bouncy>
            <KaraokeLine chunks={chunks} active={reading} accent={accent} size={30} isKey={(c) => !!word && c === chunks[1]} />
          </Pressy>
        </Animated.View>
        <View style={{ opacity: page === last ? 0.35 : 1 }}>
          <IconButton icon="next" color={accent} onPress={() => go(1)} accessibilityLabel={t('slide_next_cd')} />
        </View>
      </View>
      <View style={styles.dots}>
        {[-1, ...lesson.words.map((_, i) => i)].map((p) => (
          <View key={p} style={[styles.dot, p === page && { width: 34 }, { backgroundColor: p === page ? accent : p < page ? colors.green : '#fff' }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.lg, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  page: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 10,
    alignItems: 'center',
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    gap: space.md,
    overflow: 'hidden',
    ...shadow,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(43,42,76,0.15)' },
});
