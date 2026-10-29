import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { WordPicture } from '@/components/WordPicture';
import { lessonAudio } from '@/assets';
import { getBlendChains } from '@/data/curriculum';
import { play, speak } from '@/services/audio';
import { useVoiceTime } from '@/hooks/useVoiceTime';
import { useT } from '@/i18n';
import { colors, fonts, levelColors, radius, shadow, space } from '@/theme';
import { Bouncy, SoundWaves, StepGuide } from '../fx';
import type { BlendSegment } from '@/data/types';
import type { StepProps } from '../types';

const CARD_ORDER = ['t', 'sr', 'w'] as const;

/** Sound → stretched read → whole word, highlighted in sync with blend_meta timings. */
export function Blend({ lessonRef, onReady }: StepProps) {
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

  const runId = useRef(0);
  const run = async () => {
    const my = ++runId.current;
    setPlaying(true);
    if (src != null) {
      await play(src);
    } else {
      for (let i = 0; i < cards.length; i++) {
        if (my !== runId.current) return;
        setTtsCard(i);
        await speak(cards[i].card === 'sr' ? cards[i].text.split('-').join('... ') : cards[i].text, { rate: 0.7 });
      }
      setTtsCard(-1);
    }
    // a newer run (another word was picked) owns the state now
    if (my !== runId.current) return;
    setPlaying(false);
    setDone((d) => {
      const n = new Set(d).add(index);
      if (n.size === lesson.words.length) onReady();
      return n;
    });
  };

  useEffect(() => {
    const id = setTimeout(run, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lesson.id]);

  const go = (d: number) => setIndex((index + d + lesson.words.length) % lesson.words.length);

  return (
    <View style={styles.root}>
      <StepGuide emoji="🧩" text={t('step_guide_sound_intro')} />
      <View style={styles.row}>
        <IconButton icon="prev" color={accent} onPress={() => go(-1)} accessibilityLabel={t('vocabulary_previous_cd')} />
        <Pressy onPress={run} silent disabled={playing} style={[styles.picture, { borderBottomColor: accent }]}>
          <SoundWaves active={playing} size={170} color={accent} />
          <Bouncy active={playing && activeCard === cards.length - 1} popKey={index}>
            <WordPicture word={word} size={150} />
          </Bouncy>
        </Pressy>
        <IconButton icon="next" color={accent} onPress={() => go(1)} accessibilityLabel={t('vocabulary_next_cd')} />
      </View>
      <View style={styles.chain}>
        {cards.map((c, i) => {
          const now = i === activeCard;
          return (
            <View key={i} style={styles.chainItem}>
              {i > 0 && <AppText style={styles.arrow}>➜</AppText>}
              <Bouncy active={now} strength={0.8} style={[styles.card, now && { borderColor: accent, backgroundColor: '#FFF8E1' }]}>
                <AppText style={[styles.cardText, { color: c.card === 't' || now ? accent : colors.text }]}>{c.text}</AppText>
              </Bouncy>
            </View>
          );
        })}
      </View>
      <View style={styles.dots}>
        {lesson.words.map((_, i) => (
          <Pressy
            key={i}
            onPress={() => setIndex(i)}
            style={[styles.dot, i === index && { width: 34 }, { backgroundColor: i === index ? accent : done.has(i) ? colors.green : '#fff' }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.lg, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  picture: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 10,
    paddingVertical: space.md,
    overflow: 'hidden',
    ...shadow,
  },
  chain: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', rowGap: space.sm },
  chainItem: { flexDirection: 'row', alignItems: 'center' },
  arrow: { fontSize: 20, color: colors.textMuted, marginHorizontal: 4 },
  cardText: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(43,42,76,0.15)' },
  card: {
    minWidth: 84,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    ...shadow,
  },
});
