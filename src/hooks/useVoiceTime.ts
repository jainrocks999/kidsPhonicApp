import { useEffect, useState } from 'react';
import { subscribeVoiceProgress } from '@/services/audio';

const IDLE = { ms: -1, duration: 0 };

/** Voice-channel position/duration (ms) while `active`; ms = -1 when idle. */
export function useVoiceTime(active: boolean) {
  const [state, setState] = useState(IDLE);
  useEffect(() => {
    if (!active) return;
    return subscribeVoiceProgress((ms, playing, duration) => setState({ ms: playing ? ms : -1, duration }));
  }, [active]);
  return active ? state : IDLE;
}
