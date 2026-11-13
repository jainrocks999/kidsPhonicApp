import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Celebration } from '@/components/Celebration';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { RainbowText } from '@/components/RainbowText';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { promptAudio, type PromptId } from '@/assets';
import { nextLessonId } from '@/data/curriculum';
import { logEvent } from '@/services/analytics';
import { maybeRequestReview } from '@/services/review';
import type { LessonRef } from '@/data/types';
import { play, stopVoice } from '@/services/audio';
import { lockedFeedback } from '@/services/lock';
import { isLevelComplete, isUnitComplete, useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, fonts, levelColors, levelInk, radius, shadow, space } from '@/theme';
import { Bouncy } from './fx';
import { isScoredStep, stepsFor, type StepId, type StepProps } from './types';
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
  /** Furthest step reached — you can revisit anything up to here, but not skip ahead of it. */
  const [maxIndex, setMaxIndex] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<'unit' | 'level' | null>(null);
  /** Step index whose spoken intro has finished (step content mounts after it). */
  const [introDoneFor, setIntroDoneFor] = useState(-1);
  /** Score per step index — redoing a step overwrites, skipping leaves it out. */
  const scores = useRef<Record<number, number>>({});
  /** Indices of interactive steps that have been finished — drives the "finish first" gate. */
  const [cleared, setCleared] = useState<Set<number>>(() => new Set());
  const [dir, setDir] = useState<1 | -1>(1);
  const [readyFor, setReadyFor] = useState(-1);
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

  const goTo = (i: number) => {
    if (i < 0 || i === stepIndex) return;
    stopVoice();
    if (i >= steps.length) {
      finish();
      return;
    }
    setDir(i > stepIndex ? 1 : -1);
    setStepIndex(i);
    setMaxIndex((m) => Math.max(m, i));
  };

  // An interactive step (identify / match / trace) must be finished before moving on —
  // it reports a score via onDone; until then there's no leaving it.
  const scoredPending = isScoredStep(steps[stepIndex]) && !cleared.has(stepIndex);

  const next = (score?: number) => {
    if (score != null) {
      scores.current[stepIndex] = score;
      setCleared((c) => new Set(c).add(stepIndex));
    }
    goTo(stepIndex + 1);
  };

  // Forward taps from the footer / dots: blocked while the current step is still unfinished,
  // or when jumping past the furthest step reached. Going back to review is always allowed.
  const tryGoTo = (i: number) => {
    if (i > stepIndex && (scoredPending || i > maxIndex + 1)) {
      lockedFeedback(lang);
      return;
    }
    goTo(i);
  };

  const finish = () => {
    if (stars != null) return;
    // Strict scoring: average over every interactive step the lesson *expects*, not just the
    // ones that were played. A skipped scored step counts as zero, so three stars means the
    // child actually did the identify / match / trace work well.
    const expected = steps.filter(isScoredStep).length;
    const earned = steps.reduce((sum, id, i) => sum + (isScoredStep(id) ? scores.current[i] ?? 0 : 0), 0);
    const avg = expected ? earned / expected : 1;
    const s = avg >= 0.9 ? 3 : avg >= 0.6 ? 2 : 1;
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
      {introDoneFor === stepIndex ? (
        <Animated.View
          key={`${lesson.id}-${stepIndex}`}
          entering={(dir === 1 ? FadeInRight : FadeInLeft).springify().damping(16)}
          style={{ flex: 1 }}>
          <StepComponent lessonRef={lessonRef} onDone={next} onReady={() => setReadyFor(stepIndex)} />
        </Animated.View>
      ) : (
        <Pressy silent onPress={() => (stopVoice(), setIntroDoneFor(stepIndex))} style={styles.intro}>
          <Animated.View key={stepIndex} entering={ZoomIn.springify().damping(18)} style={styles.introCard}>
            <RainbowText text={lesson.displayLetter} size={110} palette={levelInk[level.number - 1]} />
            <AppText style={styles.introTitle}>{t(step.title)}</AppText>
            <View style={styles.skip}>
              <AppText style={styles.skipText}>👆 {t('common_skip')}</AppText>
            </View>
          </Animated.View>
        </Pressy>
      )}

      {/* ---------- step navigation ---------- */}
      <View style={styles.footer}>
        <IconButton
          icon="prev"
          size={52}
          color={stepIndex === 0 ? colors.locked : colors.orange}
          onPress={() => goTo(stepIndex - 1)}
          accessibilityLabel={t('chant_previous')}
        />
        <View style={styles.dots}>
          {steps.map((id, i) => {
            const locked = i > stepIndex && (scoredPending || i > maxIndex + 1);
            return (
              <Pressy
                key={id}
                onPress={() => tryGoTo(i)}
                hitSlop={6}
                accessibilityLabel={t(STEPS[id].title)}
                style={[
                  styles.dot,
                  i === stepIndex
                    ? { width: 26, backgroundColor: levelColors[level.number - 1], borderColor: levelColors[level.number - 1] }
                    : i < stepIndex && { backgroundColor: colors.green, borderColor: colors.green },
                  locked && styles.dotLocked,
                ]}
              />
            );
          })}
        </View>
        <Bouncy active={readyFor === stepIndex && !scoredPending} strength={0.4}>
          <Pressy
            onPress={() => tryGoTo(stepIndex + 1)}
            accessibilityRole="button"
            accessibilityState={{ disabled: scoredPending }}
            style={[styles.next, scoredPending && styles.nextLocked]}>
            <AppText style={styles.nextText}>{scoredPending ? t('common_finish') : t('common_next')}</AppText>
            <Icon name={scoredPending ? 'lock' : 'next'} size={22} />
          </Pressy>
        </Bouncy>
      </View>

      <Celebration
        visible={stars != null}
        accent={levelColors[level.number - 1]}
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
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  introCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 10,
    borderBottomColor: colors.border,
    paddingVertical: space.lg,
    ...shadow,
  },
  introTitle: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, color: colors.primaryDark },
  skip: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 6 },
  skipText: { fontFamily: fonts.bold, fontSize: 16, color: colors.textMuted },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    marginTop: space.sm,
    marginBottom: space.xs,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    ...shadow,
  },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: '#fff' },
  dotLocked: { backgroundColor: colors.locked, borderColor: colors.locked, opacity: 0.5 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: 18,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 6,
    borderBottomColor: '#13A850',
  },
  nextLocked: { backgroundColor: colors.locked, borderBottomColor: '#9EA3BF' },
  nextText: { color: '#fff', fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
});
