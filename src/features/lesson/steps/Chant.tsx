import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { getChantMeta, getVoiceTiming } from '@/data/curriculum';
import { play, speak } from '@/services/audio';
import { useVoiceTime } from '@/hooks/useVoiceTime';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import { Bouncy, KaraokeLine, StepGuide, spanAt } from '../fx';
import type { StepProps } from '../types';

export function Chant({ lessonRef, onReady }: StepProps) {
  const t = useT();
  const { lesson, level, assetKey } = lessonRef;
  const lines = lesson.chantOrder.map((i) => ({ text: lesson.chantTexts[i], word: lesson.words[i] }));
  const src = lessonAudio.chant(lessonRef);
  const meta = getChantMeta(assetKey);
  const timing = src != null ? getVoiceTiming(assetKey) : undefined;
  const [playing, setPlaying] = useState(false);
  const [ttsIndex, setTtsIndex] = useState(-1);
  const { ms, duration } = useVoiceTime(playing && src != null);
  const accent = levelColors[level.number - 1];

  // Measured timing: which line is heard now, and which of its chunks ("A" / "A" / "Apple").
  const heard = timing?.chant?.find((l) => ms >= l.start - 80 && ms <= l.end + 200);
  // first round: "A" / "A" / "Apple" one by one; sung rounds: one burst = that card's word
  const chunk = heard && !heard.word ? spanAt(heard.chunks ?? undefined, ms) : -1;
  // sung part without reliable lines: everyone dances on the beat
  const beat = !heard && playing ? spanAt(timing?.beats, ms) : -1;

  // no measured timing: old estimate — sung part from meta.start_ms, lines evenly spaced
  const lineMs = meta ? (duration > meta.start_ms ? (duration - meta.start_ms) / lines.length : meta.slide_ms ?? 3000) : 1;
  const active =
    src == null
      ? ttsIndex
      : timing?.chant
        ? heard?.line ?? -1
        : meta && ms >= meta.start_ms
          ? Math.min(lines.length - 1, Math.floor((ms - meta.start_ms) / lineMs))
          : -1;

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
    onReady();
  };

  useEffect(() => {
    const id = setTimeout(start, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  return (
    <View style={styles.root}>
      <StepGuide emoji="🎵" text={t('step_guide_chant')} />
      <View style={styles.grid}>
        {lines.map((l, i) => {
          const now = i === active;
          const parts = l.text.split('-').filter(Boolean);
          const said = now ? (heard?.word ? parts.length - 1 : chunk) : -1;
          return (
            <Bouncy
              key={i}
              active={now}
              beatKey={now ? (heard?.word ? heard.start : said) : beat >= 0 ? beat * 10 + i : -1}
              strength={0.6}
              style={[
                styles.card,
                now && { borderColor: accent, borderBottomColor: accent, backgroundColor: '#FFF8E1' },
                playing && active >= 0 && !now && { opacity: 0.5 },
              ]}>
              <Bouncy active={false} beatKey={now && said === parts.length - 1 ? heard?.start ?? i : -1} strength={1.2}>
                <WordPicture word={l.word} size={80} />
              </Bouncy>
              <KaraokeLine chunks={parts} active={said} accent={accent} size={22} isKey={(c) => c === parts[parts.length - 1]} />
            </Bouncy>
          );
        })}
      </View>
      <Button label={`🔁 ${t('chant_listen_cd')}`} variant="outline" color={accent} onPress={start} disabled={playing} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md, justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  card: {
    width: '46%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: colors.border,
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    gap: space.sm,
    ...shadow,
  },
});
