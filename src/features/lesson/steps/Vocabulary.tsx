import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { VoiceRecorder } from '../VoiceRecorder';
import { lessonAudio } from '@/assets';
import { play } from '@/services/audio';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import type { StepProps } from '../types';

export function Vocabulary({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, level } = lessonRef;
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  const word = lesson.words[index];
  const accent = levelColors[level.number - 1];

  const say = (i = index) => play(lessonAudio.vocab(lessonRef, i), lesson.words[i].word);

  useEffect(() => {
    say(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lesson.id]);

  const go = (d: number) => {
    const n = (index + d + lesson.words.length) % lesson.words.length;
    setIndex(n);
    setSeen((s) => new Set(s).add(n));
  };

  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        👆 {t('step_guide_vocabulary')}
      </AppText>
      <View style={styles.row}>
        <IconButton icon="prev" onPress={() => go(-1)} accessibilityLabel={t('vocabulary_previous_cd')} />
        <Pressy onPress={() => say()} silent style={styles.card} accessibilityLabel={t('vocabulary_listen_cd')}>
          <WordPicture word={word} size={180} />
          <WordLabel word={word.word} split={word.split} patternIndex={word.patternIndex} accent={accent} />
          <AppText variant="caption">🔊 {t('vocabulary_listen_cd')}</AppText>
        </Pressy>
        <IconButton icon="next" onPress={() => go(1)} accessibilityLabel={t('vocabulary_next_cd')} />
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <VoiceRecorder word={word.word} onSuccess={() => go(1)} />
        <AppText variant="caption">{t('sound_intro_can_you_say', word.word)}</AppText>
      </View>
      <View style={styles.dots}>
        {lesson.words.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === index ? accent : seen.has(i) ? colors.locked : colors.border }]} />
        ))}
      </View>
      <Button label={t('common_next')} onPress={() => onDone()} disabled={seen.size < lesson.words.length} />
    </View>
  );
}

/** Word with the lesson's pattern chunk coloured (uses `split` when the curriculum provides it). */
export function WordLabel({
  word,
  split,
  patternIndex,
  accent,
  size = 40,
}: {
  word: string;
  split?: string[];
  patternIndex?: number;
  accent: string;
  size?: number;
}) {
  const parts = split ?? [word];
  return (
    <AppText variant="title" style={{ fontSize: size, lineHeight: size * 1.25 }}>
      {parts.map((p, i) => (
        <AppText key={i} variant="title" style={{ fontSize: size, color: i === patternIndex ? accent : colors.text }}>
          {p}
        </AppText>
      ))}
    </AppText>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    padding: space.lg,
    gap: space.sm,
    ...shadow,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
