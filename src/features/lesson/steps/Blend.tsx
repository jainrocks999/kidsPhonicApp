import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { getBlendChains } from '@/data/curriculum';
import { play, speak } from '@/services/audio';
import { useVoiceTime } from '@/hooks/useVoiceTime';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import type { BlendSegment } from '@/data/types';
import type { StepProps } from '../types';

const CARD_ORDER = ['t', 'sr', 'w'] as const;

/** Sound → stretched read → whole word, highlighted in sync with blend_meta timings. */
export function Blend({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, level, assetKey } = lessonRef;
  const chains = getBlendChains(assetKey);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ttsCard, setTtsCard] = useState(-1);
  const [done, setDone] = useState<Set<number>>(new Set());
  const accent = levelColors[level.number - 1];
  const word = lesson.words[index];
  const chain = chains.find((c) => c.word === word.word) ?? chains[index];
  const src = lessonAudio.blend(lessonRef, index);
  const { ms } = useVoiceTime(playing && src != null);

  const pattern = word.split && word.patternIndex != null ? word.split[word.patternIndex] : lesson.displayLetter;
  const cards: BlendSegment[] =
    chain?.segments ??
    CARD_ORDER.map((card) => ({
      card,
      text: card === 't' ? pattern : card === 'sr' ? (word.split ?? [word.word]).join('-') : word.word,
      start_ms: 0,
      end_ms: 0,
    }));
  const activeCard = src != null && chain ? cards.findIndex((s) => ms >= s.start_ms && ms <= s.end_ms + 300) : ttsCard;

  const run = async () => {
    setPlaying(true);
    if (src != null) {
      await play(src);
    } else {
      for (let i = 0; i < cards.length; i++) {
        setTtsCard(i);
        await speak(cards[i].card === 'sr' ? cards[i].text.split('-').join('... ') : cards[i].text, { rate: 0.7 });
      }
      setTtsCard(-1);
    }
    setPlaying(false);
    setDone((d) => new Set(d).add(index));
  };

  useEffect(() => {
    const id = setTimeout(run, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lesson.id]);

  const last = index === lesson.words.length - 1;

  return (
    <View style={styles.root}>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        🧩 {t('step_guide_sound_intro')}
      </AppText>
      <Pressy onPress={run} silent disabled={playing} style={styles.picture}>
        <WordPicture word={word} size={150} />
      </Pressy>
      <View style={styles.chain}>
        {cards.map((c, i) => (
          <View key={i} style={[styles.card, i === activeCard && { borderColor: accent, backgroundColor: '#FFF6E5', transform: [{ scale: 1.08 }] }]}>
            <AppText variant="title" style={{ color: c.card === 't' ? accent : colors.text }}>
              {c.text}
            </AppText>
          </View>
        ))}
      </View>
      <Button
        label={last ? t('common_next') : `${t('common_next')} ▶`}
        disabled={!done.has(index)}
        onPress={() => (last ? onDone() : setIndex(index + 1))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  picture: { alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, ...shadow },
  chain: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, flexWrap: 'wrap' },
  card: {
    minWidth: 90,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    ...shadow,
  },
});
