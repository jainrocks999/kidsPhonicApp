import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio, patternSound } from '@/assets';
import { play } from '@/services/audio';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import type { StepProps } from '../types';

export function SoundIntro({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, level } = lessonRef;
  const [heard, setHeard] = useState(false);
  const pulse = useSharedValue(1);
  const accent = levelColors[level.number - 1];
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const listen = async () => {
    pulse.set(withRepeat(withSequence(withTiming(1.08, { duration: 300 }), withTiming(1, { duration: 300 })), 4));
    const src = lessonAudio.soundIntro(lessonRef) ?? patternSound(lesson.letter.replace(/^SHORT-/, ''));
    await play(src, `${lesson.soundSpelling}. ${lesson.stretchedWord.replace(/-/g, ' ')}. ${lesson.sentence}`);
    setHeard(true);
  };

  useEffect(() => {
    const id = setTimeout(listen, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  return (
    <View style={styles.root}>
      <Pressy onPress={listen} silent style={[styles.card, { borderColor: accent }]}>
        <Animated.View style={anim}>
          <AppText variant="huge" style={{ color: accent, textAlign: 'center' }}>
            {lesson.displayLetter}
          </AppText>
        </Animated.View>
        <AppText variant="heading">🔊 {t('sound_intro_listen')}</AppText>
      </Pressy>

      <View style={styles.example}>
        <WordPicture word={lesson.words[0]} size={96} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{t('sound_intro_word_example', lesson.words[0].word)}</AppText>
          <AppText style={{ color: colors.textMuted }}>{lesson.sentence}</AppText>
        </View>
      </View>

      <AppText variant="title" style={{ textAlign: 'center' }}>
        {t('sound_intro_can_you_say', lesson.soundSpelling)}
      </AppText>

      <Button label={t('common_next')} onPress={() => onDone()} disabled={!heard} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    alignItems: 'center',
    paddingVertical: space.lg,
    gap: space.sm,
    ...shadow,
  },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
});
