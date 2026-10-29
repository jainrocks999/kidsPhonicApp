import type { LessonRef } from '@/data/types';

export type StepId = 'sound' | 'blend' | 'chant' | 'vocab' | 'identify' | 'match' | 'trace';

export interface StepProps {
  lessonRef: LessonRef;
  /** score 0..1 for scored steps; unscored steps pass nothing. */
  onDone: (score?: number) => void;
}

/** Level 1 teaches letters (trace); later levels teach sound patterns (blend). */
export function stepsFor(ref: LessonRef): StepId[] {
  return ref.level.number === 1
    ? ['sound', 'chant', 'vocab', 'identify', 'match', 'trace']
    : ['sound', 'blend', 'chant', 'vocab', 'identify', 'match'];
}
