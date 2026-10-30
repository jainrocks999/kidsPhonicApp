import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { play, praise, tryAgain } from '@/services/audio';
import { sample, shuffle } from '@/hooks/shuffle';
import { useSpeaking } from '@/hooks/useSpeaking';
import { useT } from '@/i18n';
import { colors, fonts, radius, shadow, space } from '@/theme';
import { Bouncy, SoundWaves, StepGuide } from '../fx';
import type { Word } from '@/data/types';
import type { StepProps } from '../types';

export function Identify({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, unit } = lessonRef;
  const rounds = useMemo(() => shuffle(lesson.words.map((w, i) => ({ word: w, audioIndex: i }))), [lesson]);
  const distractorPool = useMemo(
    () => unit.lessons.filter((l) => l.id !== lesson.id).flatMap((l) => l.words),
    [unit, lesson],
  );
  const [round, setRound] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [right, setRight] = useState<string | null>(null);
  const speaking = useSpeaking();
  const firstTry = useRef(0);
  const missed = useRef(false);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const current = rounds[round];
  const options = useMemo(
    () => shuffle<Word>([current.word, ...sample(distractorPool.filter((w) => w.word !== current.word.word), 2)]),
    [current, distractorPool],
  );

  const sayTarget = () => play(lessonAudio.vocab(lessonRef, current.audioIndex), current.word.word);

  useEffect(() => {
    sayTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const pick = async (w: Word) => {
    if (locked) return;
    if (w.word !== current.word.word) {
      missed.current = true;
      setWrong(w.word);
      shake.set(withSequence(withTiming(-10, { duration: 60 }), withTiming(10, { duration: 60 }), withTiming(0, { duration: 60 })));
      await tryAgain();
      return;
    }
    setLocked(true);
    setRight(w.word);
    if (!missed.current) firstTry.current++;
    await praise();
    setLocked(false);
    setRight(null);
    if (round + 1 >= rounds.length) {
      onDone(firstTry.current / rounds.length);
      return;
    }
    missed.current = false;
    setWrong(null);
    setRound(round + 1);
  };

  return (
    <View style={styles.root}>
      <StepGuide emoji="🎯" text={`${t('identify_round_progress', round + 1, rounds.length)} · ${t('step_guide_identify')}`} />
      <View style={styles.speaker}>
        <SoundWaves active={speaking && !right} size={120} color={colors.orange} />
        <Bouncy active={speaking && !right} strength={0.4}>
          <IconButton icon="speaker" size={104} color={colors.orange} onPress={sayTarget} accessibilityLabel={t('identify_listen_cd')} />
        </Bouncy>
      </View>
      <Animated.View style={[styles.options, shakeStyle]}>
        {options.map((w, i) => (
          <Animated.View key={`${round}-${w.word}`} entering={ZoomIn.delay(i * 100).springify().damping(18)}>
            <Bouncy active={right === w.word} strength={0.5}>
              <Pressy
                silent
                onPress={() => pick(w)}
                style={[
                  styles.option,
                  wrong === w.word && styles.optionWrong,
                  right === w.word && styles.optionRight,
                ]}>
                <WordPicture word={w} size={110} />
                {right === w.word && (
                  <View style={styles.tick}>
                    <AppText style={styles.tickText}>✓</AppText>
                  </View>
                )}
              </Pressy>
            </Bouncy>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.xl, justifyContent: 'center' },
  speaker: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 150, height: 150 },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 9,
    borderBottomColor: colors.border,
    padding: space.md,
    ...shadow,
  },
  optionWrong: { borderColor: colors.red, borderBottomColor: '#D63A5A', opacity: 0.5 },
  optionRight: { borderColor: colors.green, borderBottomColor: '#13A850', backgroundColor: '#E9FBEF' },
  tick: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { color: '#fff', fontFamily: fonts.bold, fontSize: 18, lineHeight: 22 },
});
