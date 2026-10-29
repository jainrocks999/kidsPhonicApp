import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { VoiceRecorder } from '../VoiceRecorder';
import { lessonAudio } from '@/assets';
import { play } from '@/services/audio';
import { useSpeaking } from '@/hooks/useSpeaking';
import { useT } from '@/i18n';
import { colors, fonts, levelColors, radius, shadow, space } from '@/theme';
import { Bouncy, SoundWaves, StepGuide } from '../fx';
import type { StepProps } from '../types';

export function Vocabulary({ lessonRef, onReady }: StepProps) {
  const t = useT();
  const { lesson, level } = lessonRef;
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  const word = lesson.words[index];
  const accent = levelColors[level.number - 1];
  const speaking = useSpeaking();

  useEffect(() => {
    if (seen.size === lesson.words.length) onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen.size]);

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
      <StepGuide emoji="👆" text={t('step_guide_vocabulary')} />
      <View style={styles.row}>
        <IconButton icon="prev" color={accent} onPress={() => go(-1)} accessibilityLabel={t('vocabulary_previous_cd')} />
        <Pressy onPress={() => say()} silent style={[styles.card, { borderBottomColor: accent }]} accessibilityLabel={t('vocabulary_listen_cd')}>
          <SoundWaves active={speaking} size={200} color={accent} />
          <Bouncy active={speaking} popKey={index}>
            <WordPicture word={word} size={170} />
          </Bouncy>
          <Bouncy active={speaking} strength={0.5}>
            <WordLabel word={word.word} split={word.split} patternIndex={word.patternIndex} accent={accent} size={46} />
          </Bouncy>
        </Pressy>
        <IconButton icon="next" color={accent} onPress={() => go(1)} accessibilityLabel={t('vocabulary_next_cd')} />
      </View>
      <View style={styles.dots}>
        {lesson.words.map((_, i) => (
          <Pressy
            key={i}
            onPress={() => go(i - index)}
            style={[styles.dot, i === index && { width: 34 }, { backgroundColor: i === index ? accent : seen.has(i) ? colors.green : '#fff' }]}
          />
        ))}
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <VoiceRecorder word={word.word} onSuccess={() => go(1)} />
        <AppText style={styles.say}>{t('sound_intro_can_you_say', word.word)}</AppText>
      </View>
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
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  card: {
    flex: 1,
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
  say: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.primaryDark, textAlign: 'center' },
});
