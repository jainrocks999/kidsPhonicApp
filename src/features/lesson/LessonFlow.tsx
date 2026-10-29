import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Celebration } from '@/components/Celebration';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { promptAudio, type PromptId } from '@/assets';
import { nextLessonId } from '@/data/curriculum';
import type { LessonRef } from '@/data/types';
import { play, stopVoice } from '@/services/audio';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { levelColors, space } from '@/theme';
import { stepsFor, type StepId, type StepProps } from './types';
import { SoundIntro } from './steps/SoundIntro';
import { Chant } from './steps/Chant';
import { Vocabulary } from './steps/Vocabulary';
import { Identify } from './steps/Identify';
import { MatchingStep } from './steps/MatchingStep';
import { Tracing } from './steps/Tracing';
import { Blend } from './steps/Blend';

const STEPS: Record<StepId, { component: (p: StepProps) => React.JSX.Element; title: StringKey; prompt: PromptId }> = {
  sound: { component: SoundIntro, title: 'sound_intro_title', prompt: 'step_sound' },
  blend: { component: Blend, title: 'sound_intro_title', prompt: 'step_blend' },
  chant: { component: Chant, title: 'chant_title', prompt: 'step_chant' },
  vocab: { component: Vocabulary, title: 'vocabulary_title', prompt: 'step_vocab' },
  identify: { component: Identify, title: 'identify_title', prompt: 'step_identify' },
  match: { component: MatchingStep, title: 'matching_title', prompt: 'step_match' },
  trace: { component: Tracing, title: 'tracing_title', prompt: 'step_trace' },
};

export function LessonFlow({ lessonRef }: { lessonRef: LessonRef }) {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const completeLesson = useProgress((s) => s.completeLesson);
  const steps = useMemo(() => stepsFor(lessonRef), [lessonRef]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const scores = useRef<number[]>([]);
  const { lesson, level } = lessonRef;
  const step = STEPS[steps[stepIndex]];
  const StepComponent = step.component;

  useEffect(() => () => stopVoice(), []);

  const next = (score?: number) => {
    if (score != null) scores.current.push(score);
    if (stepIndex + 1 < steps.length) {
      setStepIndex(stepIndex + 1);
      return;
    }
    const avg = scores.current.length ? scores.current.reduce((a, b) => a + b, 0) / scores.current.length : 1;
    const s = avg >= 0.85 ? 3 : avg >= 0.5 ? 2 : 1;
    completeLesson(lesson.id, s);
    setStars(s);
    play(promptAudio('lesson_done', lang));
  };

  const nextId = nextLessonId(lesson.id);
  const nextInSameUnit = nextId && lessonRef.unit.lessons.some((l) => l.id === nextId);

  return (
    <Screen title={`${lesson.displayLetter} · ${t(step.title)}`}>
      <View style={styles.progress}>
        <ProgressBar value={(stepIndex + (stars != null ? 1 : 0)) / steps.length} color={levelColors[level.number - 1]} />
        <AppText variant="caption">
          {stepIndex + 1}/{steps.length}
        </AppText>
      </View>
      <Animated.View key={`${lesson.id}-${stepIndex}`} entering={FadeInRight} style={{ flex: 1 }}>
        <StepComponent lessonRef={lessonRef} onDone={next} />
      </Animated.View>
      <Celebration
        visible={stars != null}
        stars={stars ?? 0}
        title={t('identify_all_done_title')}
        subtitle={lesson.sentence}
        primary={
          nextInSameUnit
            ? { label: t('sound_intro_next_lesson'), onPress: () => router.replace(`/lesson/${nextId}`) }
            : { label: t('lesson_complete_back_to_list'), onPress: () => router.back() }
        }
        secondary={nextInSameUnit ? { label: t('lesson_complete_back_to_list'), onPress: () => router.back() } : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
});
