import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import type { AssetId } from '@/assets';
import { sfx as sfxAssets } from '@/assets';
import { useSettings } from '@/store/settings';

/**
 * Two app-wide channels:
 *  - voice: narration / prompts / word audio — a new play() interrupts the previous one.
 *  - sfx:   click / correct / complete — short, can overlap voice, muted by the settings toggle.
 * Anything with no bundled audio falls back to on-device TTS (expo-speech).
 */
let voice: AudioPlayer | null = null;
let sfxPlayer: AudioPlayer | null = null;
let pending: (() => void) | null = null;
let token = 0;
type ProgressListener = (ms: number, playing: boolean, durationMs: number) => void;
const progressListeners = new Set<ProgressListener>();

/* "Is the voice channel talking right now?" — covers bundled audio and TTS alike, so the UI can
   animate exactly while something is being said. */
let speaking = false;
const speakingListeners = new Set<() => void>();
function setSpeaking(v: boolean) {
  if (speaking === v) return;
  speaking = v;
  speakingListeners.forEach((cb) => cb());
}
export const isSpeaking = () => speaking;
export function subscribeSpeaking(cb: () => void) {
  speakingListeners.add(cb);
  return () => {
    speakingListeners.delete(cb);
  };
}

/** Voice-channel playback position in ms — drives karaoke-style highlighting. */
export function subscribeVoiceProgress(cb: ProgressListener) {
  progressListeners.add(cb);
  return () => {
    progressListeners.delete(cb);
  };
}

export async function initAudio() {
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
}

function getVoice() {
  if (!voice) {
    voice = createAudioPlayer(null, { updateInterval: 50 });
    voice.addListener('playbackStatusUpdate', (s: AudioStatus) => {
      progressListeners.forEach((cb) => cb(s.currentTime * 1000, s.playing, s.duration * 1000));
      if (s.didJustFinish) settle();
    });
  }
  return voice;
}

function settle() {
  const done = pending;
  pending = null;
  setSpeaking(false);
  done?.();
}

export function stopVoice() {
  token++;
  settle();
  voice?.pause();
  Speech.stop();
}

/** Plays an asset (or speaks `fallbackText`) and resolves when finished or interrupted. */
export function play(source: AssetId | undefined, fallbackText?: string): Promise<void> {
  stopVoice();
  const my = token;
  if (source == null) return fallbackText ? speak(fallbackText) : Promise.resolve();
  return new Promise<void>((resolve) => {
    pending = resolve;
    setSpeaking(true);
    const p = getVoice();
    p.replace(source);
    p.seekTo(0).finally(() => {
      if (my === token) p.play();
    });
  });
}

/** `onWord(charIndex)` fires as each word starts — for exact word-by-word highlighting. */
export function speak(text: string, opts: { rate?: number; onWord?: (charIndex: number) => void } = {}): Promise<void> {
  stopVoice();
  const my = token;
  setSpeaking(true);
  const finish = (resolve: () => void) => () => {
    if (my === token) setSpeaking(false);
    resolve();
  };
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'en-GB',
      rate: opts.rate ?? 0.85,
      pitch: 1.1,
      onBoundary: opts.onWord
        ? (ev: unknown) => {
            const i = (ev as { charIndex?: number } | undefined)?.charIndex;
            if (my === token && typeof i === 'number') opts.onWord?.(i);
          }
        : undefined,
      onDone: finish(resolve),
      onStopped: finish(resolve),
      onError: finish(resolve),
    });
  });
}

export function playSfx(source: AssetId | undefined) {
  if (source == null || !useSettings.getState().soundEffects) return;
  if (!sfxPlayer) sfxPlayer = createAudioPlayer(null);
  sfxPlayer.replace(source);
  sfxPlayer.seekTo(0).finally(() => sfxPlayer?.play());
}

export const click = () => playSfx(sfxAssets.click);

export function praise() {
  playSfx(sfxAssets.correct);
  const list = sfxAssets.praise.filter((x): x is AssetId => x != null);
  return play(list[Math.floor(Math.random() * list.length)]);
}

export function tryAgain() {
  return play(sfxAssets.tryAgain, 'Try again');
}
