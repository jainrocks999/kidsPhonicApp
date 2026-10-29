import { useMemo, useRef, useState } from 'react';
import { praise, tryAgain } from '@/services/audio';
import { sample } from '@/hooks/shuffle';
import { ROUNDS } from './types';

/** Shared round/score bookkeeping for "one question per round" games. */
export function useRounds<T>(pool: T[], onFinish: (score: number) => void, rounds = ROUNDS) {
  const items = useMemo(() => sample(pool, Math.min(rounds, pool.length)), [pool, rounds]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const firstTry = useRef(0);
  const missed = useRef(false);

  const answer = async (correct: boolean) => {
    if (busy) return;
    if (!correct) {
      missed.current = true;
      await tryAgain();
      return;
    }
    setBusy(true);
    if (!missed.current) firstTry.current++;
    missed.current = false;
    await praise();
    setBusy(false);
    if (index + 1 >= items.length) onFinish(firstTry.current / items.length);
    else setIndex(index + 1);
  };

  return { item: items[index], index, total: items.length, answer, busy };
}
