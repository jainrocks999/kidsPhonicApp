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
    voice = createAudioPlayer(null, { updateInterval: 100 });
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
    const p = getVoice();
    p.replace(source);
    p.seekTo(0).finally(() => {
      if (my === token) p.play();
    });
  });
}

export function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  stopVoice();
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'en-GB',
      rate: opts.rate ?? 0.85,
      pitch: 1.1,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
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
