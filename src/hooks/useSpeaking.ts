import { useSyncExternalStore } from 'react';
import { isSpeaking, subscribeSpeaking } from '@/services/audio';

/** True while narration / word audio / TTS is playing — use it to animate what's being said. */
export function useSpeaking() {
  return useSyncExternalStore(subscribeSpeaking, isSpeaking, isSpeaking);
}
