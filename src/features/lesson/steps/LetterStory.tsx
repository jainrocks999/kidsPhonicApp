import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { play, speak } from '@/services/audio';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import type { StepProps } from '../types';

/** "The Aa Story": a title page, then one page per word — "A is for apple!". */
export function LetterStory({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, level } = lessonRef;
  const [page, setPage] = useState(-1);
  const [read, setRead] = useState(false);
  const accent = levelColors[level.number - 1];
  const word = page >= 0 ? lesson.words[page] : null;
  const letter = lesson.displayLetter.charAt(0).toUpperCase();
  const sentence = word ? t('story_page_sentence', letter, word.word) : t('story_letter_title', letter, letter.toLowerCase());

  const narrate = async () => {
    setRead(false);
    if (word && page >= 0) {
      await speak(`${letter} is for`, { rate: 0.85 });
      await play(lessonAudio.vocab(lessonRef, page), word.word);
    } else {
      await speak(`The ${letter} story`);
    }
    setRead(true);
  };

  useEffect(() => {
    const id = setTimeout(narrate, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const last = page === lesson.words.length - 1;

  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        📖 {t('step_guide_story')}
      </AppText>
      <Animated.View key={page} entering={FadeInRight} style={[styles.page, { borderColor: accent }]}>
        {word ? (
          <WordPicture word={word} size={180} />
        ) : (
          <AppText variant="huge" style={{ color: accent }}>
            {lesson.displayLetter}
          </AppText>
        )}
        <AppText variant="title" style={{ textAlign: 'center' }}>
          {sentence}
        </AppText>
        <IconButton icon="speaker" onPress={narrate} accessibilityLabel={t('story_audio_cd')} />
      </Animated.View>
      <Button
        label={last ? t('common_finish') : t('common_next')}
        disabled={!read}
        onPress={() => (last ? onDone() : setPage(page + 1))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  page: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    alignItems: 'center',
    padding: space.lg,
    gap: space.md,
    ...shadow,
  },
});
