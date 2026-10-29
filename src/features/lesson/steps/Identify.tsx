import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { play, praise, tryAgain } from '@/services/audio';
import { sample, shuffle } from '@/hooks/shuffle';
import { useT } from '@/i18n';
import { colors, radius, shadow, space } from '@/theme';
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
    if (!missed.current) firstTry.current++;
    await praise();
    setLocked(false);
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
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {t('identify_round_progress', round + 1, rounds.length)} · {t('step_guide_identify')}
      </AppText>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <IconButton icon="🔊" size={88} color={colors.yellow} onPress={sayTarget} accessibilityLabel={t('identify_listen_cd')} />
      </View>
      <Animated.View style={[styles.options, shakeStyle]}>
        {options.map((w) => (
          <Pressy
            key={w.word}
            silent
            onPress={() => pick(w)}
            style={[styles.option, wrong === w.word && { borderColor: colors.red, opacity: 0.5 }]}>
            <WordPicture word={w} size={110} />
          </Pressy>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.xl, justifyContent: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: space.md,
    ...shadow,
  },
});
