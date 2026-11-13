import type { LessonRef } from '@/data/types';

export type StepId = 'sound' | 'blend' | 'chant' | 'vocab' | 'identify' | 'match' | 'trace' | 'story';

export interface StepProps {
  lessonRef: LessonRef;
  /** score 0..1 for scored steps; unscored steps pass nothing. Moves to the next step. */
  onDone: (score?: number) => void;
  /** The step has been seen/heard enough — the footer's Next button starts to bounce. */
  onReady: () => void;
}

/** Level 1 teaches letters (trace); later levels teach sound patterns (blend). */
export function stepsFor(ref: LessonRef): StepId[] {
  return ref.level.number === 1
    ? ['sound', 'chant', 'vocab', 'identify', 'match', 'trace', 'story']
    : ['sound', 'blend', 'chant', 'vocab', 'identify', 'match'];
}

/**
 * Interactive steps the child must actually complete (they report a 0..1 score via `onDone`).
 * The lesson gate blocks skipping past these, and the star rating is averaged over them —
 * a skipped scored step counts as zero, so stars only come from real work.
 */
const SCORED: ReadonlySet<StepId> = new Set(['identify', 'match', 'trace']);
export const isScoredStep = (id: StepId) => SCORED.has(id);
