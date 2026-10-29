import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { AppText } from '@/components/AppText';
import { Celebration } from '@/components/Celebration';
import { Pressy } from '@/components/Pressy';
import { play, praise, stopVoice, tryAgain } from '@/services/audio';
import { recordError } from '@/services/analytics';
import { useT } from '@/i18n';
import { colors, shadow } from '@/theme';

const RECORD_MS = 2500;
/** Peak level (dBFS) that counts as "the child said something". Room noise sits around -50. */
const VOICE_DB = -32;
const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

/**
 * "Say the word": records ~2.5 s, plays it back, and shows success when a voice was detected.
 * (It checks that the child spoke, it does not grade pronunciation.)
 */
export function VoiceRecorder({ word, onSuccess }: { word: string; onSuccess?: () => void }) {
  const t = useT();
  const recorder = useAudioRecorder(OPTIONS);
  const state = useAudioRecorderState(recorder, 80);
  const peak = useRef(-160);
  const [result, setResult] = useState<'ok' | 'fail' | null>(null);
  const recording = state.isRecording;

  useEffect(() => {
    if (recording && state.metering != null) peak.current = Math.max(peak.current, state.metering);
  }, [recording, state.metering]);

  const pulse = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(recording ? 1.15 : 1) }],
  }));

  const start = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('common_denied'), t('vocabulary_mic_cd'));
        return;
      }
      stopVoice();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      peak.current = -160;
      recorder.record();
      setTimeout(finish, RECORD_MS);
    } catch (e) {
      recordError(e, 'voice record start');
    }
  };

  const finish = async () => {
    try {
      await recorder.stop();
    } finally {
      // Leave recording mode so playback goes to the speaker, not the earpiece (iOS).
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
    const ok = peak.current > VOICE_DB;
    if (recorder.uri) await play({ uri: recorder.uri });
    setResult(ok ? 'ok' : 'fail');
    if (ok) praise();
    else tryAgain();
  };

  return (
    <>
      <Pressy silent disabled={recording} onPress={start} accessibilityLabel={t('vocabulary_mic_cd')}>
        <Animated.View style={[styles.mic, recording && { backgroundColor: colors.red }, pulse]}>
          <AppText style={{ fontSize: 30 }}>{recording ? '🔴' : '🎤'}</AppText>
        </Animated.View>
      </Pressy>
      <Celebration
        visible={result != null}
        silent={result === 'fail'}
        emoji={result === 'ok' ? '🌟' : '🙈'}
        title={result === 'ok' ? t('score_success_title') : t('score_fail_title')}
        subtitle={result === 'ok' ? t('score_success_subtitle') : t('score_fail_subtitle')}
        primary={
          result === 'ok'
            ? { label: t('score_success_primary'), onPress: () => (setResult(null), onSuccess?.()) }
            : { label: t('score_fail_primary'), onPress: () => (setResult(null), start()) }
        }
        secondary={{ label: `🔊 ${word}`, onPress: () => recorder.uri && play({ uri: recorder.uri }) }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  mic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
});
