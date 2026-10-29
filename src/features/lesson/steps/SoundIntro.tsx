import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { RainbowText } from '@/components/RainbowText';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio, patternSound } from '@/assets';
import { getVoiceTiming } from '@/data/curriculum';
import { play, speak } from '@/services/audio';
import { useSpeaking } from '@/hooks/useSpeaking';
import { useVoiceTime } from '@/hooks/useVoiceTime';
import { useT } from '@/i18n';
import { colors, fonts, levelColors, levelInk, radius, shadow, space } from '@/theme';
import { Bouncy, KaraokeLine, SoundWaves, StepGuide, spanAt, wordAt } from '../fx';
import type { StepProps } from '../types';

type Part = 'idle' | 'sound' | 'stretch' | 'sentence' | 'teacher';

export function SoundIntro({ lessonRef, onReady }: StepProps) {
  const t = useT();
  const { lesson, level, assetKey } = lessonRef;
  const accent = levelColors[level.number - 1];
  const speaking = useSpeaking();
  const narration = lessonAudio.soundIntro(lessonRef);
  const phoneme = patternSound(lesson.letter.replace(/^SHORT-/, ''));
  const [part, setPart] = useState<Part>('idle');
  const [word, setWord] = useState(-1);
  const runId = useRef(0);
  const { ms } = useVoiceTime(part === 'teacher' && speaking);

  const sounds = [lesson.soundSpelling, lesson.stretchedWord].filter(Boolean);
  const sentence = lesson.sentence.split(' ').filter(Boolean);
  const first = lesson.letter.replace(/^SHORT-/, '').charAt(0).toLowerCase();
  const isKey = (w: string) => w.toLowerCase().startsWith(first);

  // teacher narration has no transcript — the letter "boings" on every measured burst instead
  const bursts = getVoiceTiming(assetKey)?.intro;
  const burst = part === 'teacher' && speaking ? spanAt(bursts, ms) : -1;

  /** Read-along: we say each piece ourselves, so we always know exactly what's being heard. */
  const readAlong = async () => {
    const my = ++runId.current;
    const alive = () => my === runId.current;
    setWord(-1);
    setPart('sound');
    await play(phoneme, lesson.soundSpelling);
    if (!alive()) return;
    setPart('stretch');
    await speak(lesson.stretchedWord.replace(/-/g, '... '), { rate: 0.7 });
    if (!alive()) return;
    setPart('sentence');
    setWord(0);
    await speak(lesson.sentence, { rate: 0.8, onWord: (i) => setWord(wordAt(lesson.sentence, i)) });
    if (!alive()) return;
    setPart('idle');
    setWord(-1);
    onReady();
  };

  const teacher = async () => {
    if (!narration) return readAlong();
    const my = ++runId.current;
    setWord(-1);
    setPart('teacher');
    await play(narration);
    if (my === runId.current) setPart('idle');
  };

  useEffect(() => {
    const id = setTimeout(readAlong, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const letterTalks = part === 'sound' || part === 'stretch' || burst >= 0;
  const chip = part === 'sound' ? 0 : part === 'stretch' ? 1 : -1;
  const sentenceWord = part === 'sentence' ? word : -1;

  return (
    <View style={styles.root}>
      <StepGuide emoji="👂" text={t('step_guide_sound_intro')} />

      <Pressy onPress={readAlong} silent style={[styles.card, { borderBottomColor: accent }]} accessibilityLabel={t('sound_intro_listen')}>
        <View style={styles.letterBox}>
          <SoundWaves active={letterTalks} size={170} color={accent} />
          <Bouncy active={part === 'sound' || part === 'stretch'} beatKey={burst} strength={1.1}>
            <RainbowText text={lesson.displayLetter} size={120} palette={levelInk[level.number - 1]} />
          </Bouncy>
        </View>
        <KaraokeLine chunks={sounds} active={chip} accent={accent} size={32} isKey={() => true} />
        <Pressy onPress={teacher} style={[styles.listen, { backgroundColor: accent }]}>
          <AppText style={styles.listenText}>🔊 {t('sound_intro_listen')}</AppText>
        </Pressy>
      </Pressy>

      <View style={styles.example}>
        <Bouncy active={false} beatKey={sentenceWord >= 0 && isKey(sentence[sentenceWord] ?? '') ? sentenceWord : -1} strength={0.8}>
          <WordPicture word={lesson.words[0]} size={100} />
        </Bouncy>
        <KaraokeLine chunks={sentence} active={sentenceWord} accent={accent} size={26} isKey={isKey} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 10,
    alignItems: 'center',
    paddingTop: space.md,
    paddingBottom: space.lg,
    paddingHorizontal: space.md,
    gap: space.md,
    overflow: 'hidden',
    ...shadow,
  },
  letterBox: { height: 160, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  listen: { borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
  listenText: { color: '#fff', fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  example: {
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: colors.border,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    ...shadow,
  },
});
