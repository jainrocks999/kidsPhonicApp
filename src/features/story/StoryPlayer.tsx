import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Celebration } from '@/components/Celebration';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { storyAudio, storyImage } from '@/assets';
import type { Story } from '@/data/types';
import { useVoiceTime } from '@/hooks/useVoiceTime';
import { play, speak, stopVoice } from '@/services/audio';
import { useProgress } from '@/store/progress';
import { logEvent } from '@/services/analytics';
import { useT } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';
import { KaraokeLine } from '@/features/lesson/fx';

const NEXT_PAGE_DELAY = 900; // pause after narration before the page turns by itself
const START_DELAY = 350; // pause after a page turn before narration starts
const FLIP_MS = 520;

/** The picture turns in like a book page from the side we're heading to, and the old one turns away. */
const pageIn = (d: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ perspective: 900 }, { translateX: d * 70 }, { rotateY: `${d * -38}deg` }, { scale: 0.92 }] },
    100: {
      opacity: 1,
      transform: [{ perspective: 900 }, { translateX: 0 }, { rotateY: '0deg' }, { scale: 1 }],
      easing: Easing.out(Easing.cubic),
    },
  }).duration(FLIP_MS);
const pageOut = (d: number) =>
  new Keyframe({
    0: { opacity: 1, transform: [{ perspective: 900 }, { translateX: 0 }, { rotateY: '0deg' }, { scale: 1 }] },
    100: {
      opacity: 0,
      transform: [{ perspective: 900 }, { translateX: d * -70 }, { rotateY: `${d * 38}deg` }, { scale: 0.92 }],
      easing: Easing.in(Easing.cubic),
    },
  }).duration(FLIP_MS * 0.7);

/** Words that carry the story's phonics (e.g. "SHORT-A-AM" → a, am) — kept in the accent colour like in lessons. */
function keyWordTest(story: Story) {
  const pats = story.phonics_used.flatMap((p) => p.replace(/^SHORT-/, '').split('-')).map((p) => p.toLowerCase());
  return (word: string) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    return story.level === 1 ? pats.some((p) => w.startsWith(p)) : pats.some((p) => w.includes(p));
  };
}

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

  // Refs keep async callbacks (narration, auto page turn) in step with the latest state.
  const runId = useRef(0);
  const pageRef = useRef(-1);
  const [dir, setDir] = useState(1); // +1 forward, -1 back → decides which way the page turns
  const autoRef = useRef(true);
  useEffect(() => {
    autoRef.current = autoPlay;
  }, [autoPlay]);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accent = levelColors[story.level - 1];
  const scene = page >= 0 ? story.scenes[page] : null;
  const src = scene ? storyAudio.scene(story, scene.scene) : storyAudio.title(story);
  const { ms } = useVoiceTime(playing && src != null);

  const words = scene ? scene.text.split(/\s+/) : story.title.split(/\s+/);
  const timings = scene ? scene.word_timings : story.title_timings;
  // only highlight while narration is actually running (no stale highlight from the previous page)
  const activeWord = !playing
    ? -1
    : src != null && timings
      ? timings.findIndex((w) => ms >= w.start_ms && ms < w.end_ms + 120)
      : ttsWord;

  const clearAuto = () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = null;
  };

  /** Stops narration and cancels anything scheduled to happen after it. */
  const halt = () => {
    runId.current++;
    clearAuto();
    stopVoice();
    setPlaying(false);
    setTtsWord(-1);
  };

  const finish = () => {
    halt();
    completeStory(story.id);
    logEvent('story_complete', { story_id: story.id });
    setFinished(true);
  };

  const jump = (n: number) => {
    if (n >= story.scenes.length) return finish();
    if (n < -1 || n === pageRef.current) return;
    setDir(n > pageRef.current ? 1 : -1);
    pageRef.current = n;
    setPage(n);
  };
  const turn = (d: number) => jump(pageRef.current + d);

  const narrate = async () => {
    clearAuto();
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
    if (id !== runId.current) return; // a newer narration / page turn took over
    setPlaying(false);
    if (autoRef.current) autoTimer.current = setTimeout(() => turn(1), NEXT_PAGE_DELAY);
  };

  // New page → silence the old one right away, then narrate the new one.
  useEffect(() => {
    runId.current++;
    clearAuto();
    stopVoice();
    const reset = setTimeout(() => (setPlaying(false), setTtsWord(-1)), 0);
    const id = setTimeout(narrate, START_DELAY);
    return () => {
      clearTimeout(reset);
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(
    () => () => {
      runId.current++;
      clearAuto();
      stopVoice();
    },
    [],
  );

  // Slow "Ken Burns" drift on the picture while the page is open.
  const kb = useSharedValue(1);
  useEffect(() => {
    kb.set(1);
    kb.set(withTiming(1.1, { duration: 14000, easing: Easing.linear }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  const kbStyle = useAnimatedStyle(() => ({ transform: [{ scale: kb.value }] }));

  // Main button breathes while the story is being read.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(
      playing
        ? withRepeat(withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })), -1)
        : withTiming(1, { duration: 200 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const isKey = useMemo(() => keyWordTest(story), [story]);
  const img = scene ? storyImage(story, scene.scene) : storyImage(story, 1);
  const frameW = Math.min(width - space.lg * 2, 520);
  const frameH = frameW * (1536 / 2752);

  const replay = () => {
    setFinished(false);
    setDir(-1);
    pageRef.current = -1;
    setPage(-1);
  };

  return (
    <Screen
      title={t('story_title')}
      right={
        <IconButton
          icon={autoPlay ? 'pause' : 'play'}
          color={autoPlay ? colors.green : colors.locked}
          onPress={() => setAutoPlay(!autoPlay)}
          accessibilityLabel="Auto play"
        />
      }
    >
      <View style={styles.root}>
        <View style={{ width: frameW, height: frameH }}>
          {/* both pages sit on top of each other while one turns out and the next turns in */}
          <Animated.View
            key={`frame-${page}`}
            entering={pageIn(dir)}
            exiting={pageOut(dir)}
            style={[styles.frame, StyleSheet.absoluteFill]}>
            <Animated.View style={[StyleSheet.absoluteFill, kbStyle]}>
              {img ? (
                <Image source={img} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
              ) : (
                <LinearGradient colors={[accent, colors.yellow]} style={[StyleSheet.absoluteFill, styles.placeholder]}>
                  <AppText style={{ fontSize: 64 }}>📖</AppText>
                </LinearGradient>
              )}
            </Animated.View>
            {page >= 0 && (
              <View style={styles.counter}>
                <AppText variant="caption" style={{ color: '#fff' }}>
                  {page + 1}/{story.scenes.length}
                </AppText>
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.textBox}>
          <ScrollView contentContainerStyle={styles.textScroll} showsVerticalScrollIndicator={false}>
            {page === -1 && (
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                {story.phonics_used.join(' · ')}
              </AppText>
            )}
            {/* same read-along as the lessons: the spoken word lifts and glows, phonics words stay coloured */}
            <KaraokeLine
              key={`text-${page}`}
              chunks={words}
              active={activeWord}
              accent={accent}
              size={page === -1 ? 30 : 24}
              isKey={isKey}
              stagger={45}
            />
          </ScrollView>
        </View>

        {/* tap a dot to jump straight to that page */}
        <View style={styles.dots}>
          {[-1, ...story.scenes.map((_, i) => i)].map((i) => (
            <Dot key={i} active={i === page} visited={i < page} accent={accent} onPress={() => jump(i)} />
          ))}
        </View>

        <View style={styles.controls}>
          <View style={page === -1 ? styles.off : undefined} pointerEvents={page === -1 ? 'none' : 'auto'}>
            <IconButton icon="prev" onPress={() => turn(-1)} accessibilityLabel={t('slide_previous_cd')} />
          </View>
          <Animated.View style={pulseStyle}>
            <IconButton
              icon={playing ? 'pause' : 'speaker'}
              size={72}
              color={colors.yellow}
              onPress={() => (playing ? halt() : narrate())}
              accessibilityLabel={t('story_audio_cd')}
            />
          </Animated.View>
          <IconButton icon="next" onPress={() => turn(1)} accessibilityLabel={t('slide_next_cd')} />
        </View>
      </View>
      <Celebration
        visible={finished}
        accent={accent}
        title={t('identify_all_done_title')}
        subtitle={story.title}
        primary={{ label: t('step_home_action'), onPress: () => router.back() }}
        secondary={{ label: t('level_complete_replay'), onPress: replay }}
      />
    </Screen>
  );
}

/** Progress dot: the current page stretches into a pill; visited pages keep a lighter tint. */
function Dot({ active, visited, accent, onPress }: { active: boolean; visited: boolean; accent: string; onPress: () => void }) {
  const w = useSharedValue(active ? 26 : 10);
  useEffect(() => {
    w.set(withTiming(active ? 26 : 10, { duration: 250 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Pressy silent onPress={onPress} style={styles.dotHit}>
      <Animated.View
        style={[styles.dot, style, { backgroundColor: active ? accent : visited ? `${accent}77` : colors.border }]}
      />
    </Pressy>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, alignItems: 'center' },
  frame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, ...shadow },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  counter: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(25,20,60,0.55)',
  },
  textBox: { flex: 1, alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow },
  textScroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg, gap: space.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dotHit: { paddingHorizontal: 4, paddingVertical: 8 },
  dot: { height: 10, borderRadius: 5 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.xl },
  off: { opacity: 0.3 },
});