import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Celebration } from '@/components/Celebration';
import { ProgressBar } from '@/components/ProgressBar';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { promptAudio, type PromptId } from '@/assets';
import { nextLessonId } from '@/data/curriculum';
import { logEvent } from '@/services/analytics';
import { maybeRequestReview } from '@/services/review';
import type { LessonRef } from '@/data/types';
import { play, stopVoice } from '@/services/audio';
import { isLevelComplete, isUnitComplete, useProgress } from '@/store/progress';
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
import { LetterStory } from './steps/LetterStory';

const STEPS: Record<StepId, { component: (p: StepProps) => React.JSX.Element; title: StringKey; prompt: PromptId }> = {
  sound: { component: SoundIntro, title: 'sound_intro_title', prompt: 'step_sound' },
  blend: { component: Blend, title: 'sound_intro_title', prompt: 'step_blend' },
  chant: { component: Chant, title: 'chant_title', prompt: 'step_chant' },
  vocab: { component: Vocabulary, title: 'vocabulary_title', prompt: 'step_vocab' },
  identify: { component: Identify, title: 'identify_title', prompt: 'step_identify' },
  match: { component: MatchingStep, title: 'matching_title', prompt: 'step_match' },
  trace: { component: Tracing, title: 'tracing_title', prompt: 'step_trace' },
  story: { component: LetterStory, title: 'story_title', prompt: 'step_story' },
};

export function LessonFlow({ lessonRef }: { lessonRef: LessonRef }) {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const completeLesson = useProgress((s) => s.completeLesson);
  const steps = useMemo(() => stepsFor(lessonRef), [lessonRef]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<'unit' | 'level' | null>(null);
  /** Step index whose spoken intro has finished (step content mounts after it). */
  const [introDoneFor, setIntroDoneFor] = useState(-1);
  const scores = useRef<number[]>([]);
  const { lesson, level } = lessonRef;
  const step = STEPS[steps[stepIndex]];
  const StepComponent = step.component;

  useEffect(() => {
    logEvent('lesson_start', { lesson_id: lesson.id, level: level.number });
    return () => stopVoice();
  }, [lesson.id, level.number]);

  useEffect(() => {
    // Spoken step cue ("Listen and repeat…") first; the step's own audio starts after it.
    let alive = true;
    const id = setTimeout(() => {
      play(promptAudio(step.prompt, lang)).then(() => alive && setIntroDoneFor(stepIndex));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [step.prompt, stepIndex, lang]);

  const next = (score?: number) => {
    if (score != null) scores.current.push(score);
    if (stepIndex + 1 < steps.length) {
      setStepIndex(stepIndex + 1);
      return;
    }
    const avg = scores.current.length ? scores.current.reduce((a, b) => a + b, 0) / scores.current.length : 1;
    const s = avg >= 0.85 ? 3 : avg >= 0.5 ? 2 : 1;
    const before = useProgress.getState().lessons;
    const unitWasDone = isUnitComplete(lessonRef.unit, before);
    const levelWasDone = isLevelComplete(level, before);
    completeLesson(lesson.id, s);
    const after = useProgress.getState().lessons;
    logEvent('lesson_complete', { lesson_id: lesson.id, level: level.number, stars: s });
    setStars(s);

    if (!levelWasDone && isLevelComplete(level, after)) {
      setMilestone('level');
      logEvent('level_complete', { level: level.number });
    } else if (!unitWasDone && isUnitComplete(lessonRef.unit, after)) {
      setMilestone('unit');
      logEvent('unit_complete', { unit_id: lessonRef.unit.id });
      play(promptAudio('unit_done', lang))
        .then(() => play(promptAudio('unlock_story_games', lang)))
        .then(() => maybeRequestReview(lessonRef.unit.id));
      return;
    }
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
      {introDoneFor === stepIndex ? (
        <Animated.View key={`${lesson.id}-${stepIndex}`} entering={FadeInRight} style={{ flex: 1 }}>
          <StepComponent lessonRef={lessonRef} onDone={next} />
        </Animated.View>
      ) : (
        <Pressy silent onPress={() => (stopVoice(), setIntroDoneFor(stepIndex))} style={styles.intro}>
          <Animated.View key={stepIndex} entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: space.sm }}>
            <AppText variant="huge" style={{ color: levelColors[level.number - 1] }}>
              {lesson.displayLetter}
            </AppText>
            <AppText variant="title">{t(step.title)}</AppText>
            <AppText variant="caption">👆 {t('common_skip')}</AppText>
          </Animated.View>
        </Pressy>
      )}
      <Celebration
        visible={stars != null}
        stars={stars ?? 0}
        title={t('identify_all_done_title')}
        subtitle={milestone === 'unit' ? `${t('home_unit_label', lessonRef.unit.number, lessonRef.unit.title)} ✅` : lesson.sentence}
        primary={
          milestone === 'level'
            ? { label: t('common_next'), onPress: () => router.replace(`/level-complete/${level.id}`) }
            : nextInSameUnit
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
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
