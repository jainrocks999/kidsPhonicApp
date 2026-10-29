import { MatchPairs } from './Matching';
import { useT } from '@/i18n';
import { levelColors } from '@/theme';
import type { StepProps } from '../types';

export function MatchingStep({ lessonRef, onDone }: StepProps) {
  const t = useT();
  return (
    <MatchPairs
      words={lessonRef.lesson.words}
      guide={t('step_guide_matching')}
      accent={levelColors[lessonRef.level.number - 1]}
      onDone={onDone}
    />
  );
}
