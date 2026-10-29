import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Celebration } from '@/components/Celebration';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { storyAudio, storyImage } from '@/assets';
import type { Story } from '@/data/types';
import { useVoiceTime } from '@/hooks/useVoiceTime';
import { play, speak, stopVoice } from '@/services/audio';
import { useProgress } from '@/store/progress';
import { logEvent } from '@/services/analytics';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';

/** Picture-book player: scene image + narration with word-by-word highlighting, auto page turn. */
export function StoryPlayer({ story }: { story: Story }) {
  const t = useT();
  const { width } = useWindowDimensions();
  const completeStory = useProgress((s) => s.completeStory);
  const [page, setPage] = useState(-1); // -1 = title page
  const [playing, setPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [finished, setFinished] = useState(false);
  const [ttsWord, setTtsWord] = useState(-1);
  const runId = useRef(0);
  const accent = levelColors[story.level - 1];
  const scene = page >= 0 ? story.scenes[page] : null;
  const src = scene ? storyAudio.scene(story, scene.scene) : storyAudio.title(story);
  const { ms } = useVoiceTime(playing && src != null);

  const words = scene ? scene.text.split(/\s+/) : story.title.split(/\s+/);
  const timings = scene ? scene.word_timings : story.title_timings;
  const activeWord =
    src != null && timings ? timings.findIndex((w) => ms >= w.start_ms && ms < w.end_ms + 120) : ttsWord;

  const narrate = async () => {
    const id = ++runId.current;
    setPlaying(true);
    if (src != null) {
      await play(src);
    } else {
      // No bundled narration for this pack: speak word-by-word so highlighting still works.
      for (let i = 0; i < words.length && id === runId.current; i++) {
        setTtsWord(i);
        await speak(words[i], { rate: 0.8 });
      }
      setTtsWord(-1);
    }
    if (id !== runId.current) return;
    setPlaying(false);
    if (autoPlay) setTimeout(() => id === runId.current && turn(1), 700);
  };

  const turn = (d: number) => {
    setPage((p) => {
      const n = p + d;
      if (n >= story.scenes.length) {
        completeStory(story.id);
        logEvent('story_complete', { story_id: story.id });
        setFinished(true);
        return p;
      }
      return Math.max(-1, n);
    });
  };

  useEffect(() => {
    const id = setTimeout(narrate, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(
    () => () => {
      runId.current++;
      stopVoice();
    },
    [],
  );

  const img = scene ? storyImage(story, scene.scene) : storyImage(story, 1);
  const imgH = Math.min(width - space.lg * 2, 520) * (1536 / 2752);

  return (
    <Screen
      title={t('story_title')}
      right={<IconButton icon={autoPlay ? 'pause' : 'play'} color={colors.green} onPress={() => setAutoPlay(!autoPlay)} accessibilityLabel="Auto play" />}>
      <View style={styles.root}>
        <Animated.View key={page} entering={FadeIn.duration(400)} style={[styles.frame, { height: imgH }]}>
          {img ? (
            <Image source={img} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          ) : (
            <LinearGradient colors={[accent, colors.yellow]} style={[StyleSheet.absoluteFill, styles.placeholder]}>
              <AppText style={{ fontSize: 64 }}>📖</AppText>
            </LinearGradient>
          )}
        </Animated.View>

        <View style={styles.textBox}>
          {page === -1 && <AppText variant="caption">{story.phonics_used.join(' · ')}</AppText>}
          <AppText variant={page === -1 ? 'title' : 'heading'} style={styles.text}>
            {words.map((w, i) => (
              <AppText
                key={i}
                variant={page === -1 ? 'title' : 'heading'}
                style={i === activeWord ? { color: accent, textDecorationLine: 'underline' } : undefined}>
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </AppText>
            ))}
          </AppText>
        </View>

        <View style={styles.dots}>
          {[-1, ...story.scenes.map((_, i) => i)].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === page ? accent : colors.border }]} />
          ))}
        </View>

        <View style={styles.controls}>
          <IconButton icon="prev" onPress={() => turn(-1)} accessibilityLabel={t('slide_previous_cd')} />
          <IconButton icon="speaker" size={72} color={colors.yellow} onPress={narrate} accessibilityLabel={t('story_audio_cd')} />
          <IconButton icon="next" onPress={() => turn(1)} accessibilityLabel={t('slide_next_cd')} />
        </View>
      </View>
      <Celebration
        visible={finished}
        title={t('identify_all_done_title')}
        subtitle={story.title}
        primary={{ label: t('step_home_action'), onPress: () => router.back() }}
        secondary={{ label: t('level_complete_replay'), onPress: () => (setFinished(false), setPage(-1)) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg },
  frame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, ...shadow },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  textBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, justifyContent: 'center', gap: space.sm, ...shadow },
  text: { textAlign: 'center', lineHeight: 34 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.xl },
});
