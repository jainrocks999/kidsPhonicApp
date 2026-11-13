import * as Haptics from 'expo-haptics';
import { promptAudio } from '@/assets';
import { play } from './audio';

/**
 * "That's locked" cue for a kid: a soft warning buzz plus the spoken "finish the one
 * before first" prompt. Used anywhere a locked level / unit / lesson / step is tapped.
 */
export function lockedFeedback(language: 'en' | 'vi') {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  play(promptAudio('locked', language));
}
