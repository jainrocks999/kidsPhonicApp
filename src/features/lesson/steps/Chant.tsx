import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { getChantMeta } from '@/data/curriculum';
import { play, speak } from '@/services/audio';
import { useVoiceTime } from '@/hooks/useVoiceTime';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import type { StepProps } from '../types';

export function Chant({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, level, assetKey } = lessonRef;
  const lines = lesson.chantOrder.map((i) => ({ text: lesson.chantTexts[i], word: lesson.words[i] }));
  const src = lessonAudio.chant(lessonRef);
  const meta = getChantMeta(assetKey);
  const [playing, setPlaying] = useState(false);
  const [ttsIndex, setTtsIndex] = useState(-1);
  const [finished, setFinished] = useState(false);
  const { ms, duration } = useVoiceTime(playing && src != null);
  const accent = levelColors[level.number - 1];

  // The sung part starts at meta.start_ms; lines are evenly spaced to the end of the track.
  const lineMs = meta ? (duration > meta.start_ms ? (duration - meta.start_ms) / lines.length : meta.slide_ms ?? 3000) : 1;
  const active =
    src != null
      ? meta && ms >= meta.start_ms
        ? Math.min(lines.length - 1, Math.floor((ms - meta.start_ms) / lineMs))
        : -1
      : ttsIndex;

  const start = async () => {
    setPlaying(true);
    if (src != null) {
      await play(src);
    } else {
      for (let i = 0; i < lines.length; i++) {
        setTtsIndex(i);
        await speak(lines[i].text.replace(/-/g, ', '), { rate: 0.8 });
      }
      setTtsIndex(-1);
    }
    setPlaying(false);
    setFinished(true);
  };

  useEffect(() => {
    const id = setTimeout(start, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        🎵 {t('step_guide_chant')}
      </AppText>
      <View style={styles.grid}>
        {lines.map((l, i) => (
          <View key={i} style={[styles.card, i === active && { borderColor: accent, transform: [{ scale: 1.06 }] }]}>
            <WordPicture word={l.word} size={84} />
            <AppText variant="heading" style={{ color: i === active ? accent : colors.text }}>
              {l.text}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ gap: space.sm }}>
        <Button label={`🔁 ${t('chant_listen_cd')}`} variant="outline" color={accent} onPress={start} disabled={playing} />
        <Button label={t('common_next')} onPress={() => onDone()} disabled={!finished} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.md, justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  card: {
    width: '46%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    padding: space.md,
    gap: space.xs,
    ...shadow,
  },
});
