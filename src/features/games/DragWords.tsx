import { useMemo } from 'react';
import { MatchPairs } from '../lesson/steps/Matching';
import { sample } from '@/hooks/shuffle';
import { useT } from '@/i18n';
import { levelColors } from '@/theme';
import type { GameProps } from './types';

export function DragWords({ level, words, onFinish }: GameProps) {
  const t = useT();
  const picked = useMemo(() => sample(words, 4), [words]);
  return <MatchPairs words={picked} guide={t('drag_words_guide')} accent={levelColors[level.number - 1]} onDone={onFinish} />;
}
