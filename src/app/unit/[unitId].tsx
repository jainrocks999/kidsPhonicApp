import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { RainbowText } from '@/components/RainbowText';
import { Screen } from '@/components/Screen';
import { WordPicture } from '@/components/WordPicture';
import { promptAudio, storyImage } from '@/assets';
import { getUnit, getUnitStory } from '@/data/curriculum';
import { GAME_META, GAMES_FOR_LEVEL } from '@/features/games/types';
import { play } from '@/services/audio';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, fonts, levelInk, radius, shadow, space, unitColors, unitDark } from '@/theme';

const PAD = space.md;
const GAP = space.sm + 4;

export default function UnitScreen() {
  const t = useT();
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const found = getUnit(unitId);
  const { lessons, stories, games } = useProgress();
  const language = useSettings((s) => s.language);
  const { width } = useWindowDimensions();

  useEffect(() => {
    play(promptAudio('pick_lesson', language));
  }, [language]);

  if (!found) return <Redirect href="/home" />;

  const { level, unit } = found;
  const colorIndex = (unit.number - 1) % unitColors.length;
  const ink = levelInk[level.number - 1];
  const story = getUnitStory(level, unit);
  const cover = story ? storyImage(story, story.scenes[0]?.scene ?? 1) : undefined;
  const doneCount = unit.lessons.filter((l) => lessons[l.id]).length;
  const nextLesson = unit.lessons.findIndex((l) => !lessons[l.id]);
  const gameW = (width - PAD * 2 - GAP) / 2;
  // "Lesson %1$d: %2$s" → "Lesson 2" (keeps the translated word)
  const lessonName = (n: number) => t('lesson_sheet_lesson_label', n, '').replace(/[\s:]+$/, '');

  return (
    <Screen theme="candySky" title={t('home_unit_label', unit.number, unit.title)}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {/* ---------- lessons ---------- */}
        <SectionHeader emoji="🔤" title={lessonName(0).replace(/[\s\d]+$/, '')} count={`${doneCount}/${unit.lessons.length}`} />
        <View style={styles.stack}>
          {unit.lessons.map((lesson, i) => {
            const color = unitColors[(colorIndex + i) % unitColors.length];
            const edge = unitDark[(colorIndex + i) % unitDark.length];
            const stars = lessons[lesson.id] ?? 0;
            const isNext = i === nextLesson;
            // "ame ake" → two lines so each chunk stays big
            const letters = lesson.displayLetter.replace(/ /g, '\n');
            const twoLines = letters.includes('\n');
            const longest = Math.max(...letters.split('\n').map((l) => l.length));
            const letterSize = (twoLines ? 30 : 54) * (longest <= 2 ? 1 : longest === 3 ? 0.8 : 0.64);

            return (
              <Pressy
                key={lesson.id}
                onPress={() => router.push(`/lesson/${lesson.id}`)}
                accessibilityLabel={t('lesson_sheet_lesson_label', i + 1, lesson.displayLetter)}
                style={[
                  styles.lesson,
                  { borderColor: isNext ? colors.yellow : '#fff', borderBottomColor: isNext ? '#E0A800' : edge },
                ]}>
                <View style={[styles.letterTile, { backgroundColor: color + '1F', borderColor: color }]}>
                  <RainbowText
                    text={letters}
                    size={letterSize}
                    palette={ink}
                    numberOfLines={twoLines ? 2 : 1}
                    style={styles.center}
                  />
                </View>

                <View style={styles.lessonInfo}>
                  <AppText style={[styles.lessonTitle, { color: edge }]} numberOfLines={1}>
                    {lessonName(i + 1)}
                  </AppText>
                  <View style={styles.words}>
                    {lesson.words.slice(0, 3).map((w) => (
                      <WordPicture key={w.word} word={w} size={36} />
                    ))}
                  </View>
                  <View style={styles.stars}>
                    {[0, 1, 2].map((s) => (
                      <AppText key={s} style={[styles.star, s >= stars && styles.starOff]}>⭐</AppText>
                    ))}
                  </View>
                </View>

                <View
                  style={[
                    styles.play,
                    { backgroundColor: stars ? colors.green : color, borderBottomColor: stars ? '#13A850' : edge },
                  ]}>
                  <AppText style={styles.playText}>{stars ? '✓' : '▶'}</AppText>
                </View>

                {isNext && (
                  <View style={styles.nextTag}>
                    <AppText style={styles.nextTagText}>{t('home_start_button')}</AppText>
                  </View>
                )}
              </Pressy>
            );
          })}
        </View>

        {/* ---------- story ---------- */}
        {story && (
          <>
            <SectionHeader emoji="📖" title={t('lesson_sheet_story_label')} />
            <Pressy
              onPress={() => router.push(`/story/${story.id}`)}
              accessibilityLabel={story.title}
              style={[styles.story, { borderBottomColor: unitDark[unitColors.indexOf(colors.orange)] }]}>
              <View style={styles.cover}>
                {cover ? (
                  <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <AppText style={styles.coverEmoji}>📖</AppText>
                )}
                <View style={styles.coverPlay}>
                  <AppText style={styles.coverPlayText}>▶</AppText>
                </View>
                {!!stories[story.id] && (
                  <View style={[styles.doneBadge, { top: 10, right: 10 }]}>
                    <AppText style={styles.doneBadgeText}>✓</AppText>
                  </View>
                )}
              </View>
              <AppText style={styles.storyTitle} numberOfLines={2}>{story.title}</AppText>
            </Pressy>
          </>
        )}

        {/* ---------- mini games ---------- */}
        <SectionHeader emoji="🎮" title={t('lesson_map_games_label')} />
        <View style={styles.grid}>
          {GAMES_FOR_LEVEL(level.number).map((g, i) => {
            const meta = GAME_META[g];
            const color = unitColors[(colorIndex + i + 2) % unitColors.length];
            const edge = unitDark[(colorIndex + i + 2) % unitDark.length];
            const played = !!games[`${unit.id}:${g}`];
            const label = meta.title.includes('_') ? t(meta.title as StringKey) : meta.title;
            return (
              <Pressy
                key={g}
                onPress={() => router.push(`/game/${unit.id}/${g}`)}
                accessibilityLabel={label}
                style={[styles.game, { width: gameW, borderBottomColor: edge }]}>
                <View style={[styles.gameArt, { backgroundColor: color }]}>
                  <View style={styles.gameShine} />
                  <AppText style={styles.gameEmoji}>{meta.emoji}</AppText>
                </View>
                <AppText style={[styles.gameLabel, { color: edge }]} numberOfLines={2}>{label}</AppText>
                {played && (
                  <View style={[styles.doneBadge, { top: -8, right: -8 }]}>
                    <AppText style={styles.doneBadgeText}>⭐</AppText>
                  </View>
                )}
              </Pressy>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ emoji, title, count }: { emoji: string; title: string; count?: string }) {
  return (
    <View style={styles.header}>
      <AppText style={styles.headerEmoji}>{emoji}</AppText>
      <AppText style={styles.headerTitle}>{title}</AppText>
      {!!count && (
        <View style={styles.headerCount}>
          <AppText style={styles.headerCountText}>{count}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: PAD, paddingBottom: space.xl * 2 },
  center: { textAlign: 'center' },

  /* section header */
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.lg, marginBottom: GAP + 4 },
  headerEmoji: { fontSize: 28, lineHeight: 36 },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  headerCount: { backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 4, ...shadow },
  headerCountText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.text },

  /* lessons */
  stack: { gap: GAP + 4 },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderBottomWidth: 8,
    padding: 12,
    ...shadow,
  },
  letterTile: {
    width: 100,
    height: 100,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  lessonInfo: { flex: 1, gap: 6 },
  lessonTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  words: { flexDirection: 'row', gap: 6 },
  stars: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 18, lineHeight: 22 },
  starOff: { opacity: 0.2 },
  play: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: { color: '#fff', fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  nextTag: {
    position: 'absolute',
    top: -14,
    right: 18,
    backgroundColor: colors.yellow,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  nextTagText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.text },

  /* story */
  story: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 8,
    padding: 10,
    gap: 10,
    ...shadow,
  },
  cover: {
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 72, lineHeight: 88 },
  coverPlay: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  coverPlayText: { fontSize: 30, lineHeight: 36, color: colors.orange, fontFamily: fonts.bold, marginLeft: 4 },
  storyTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text, textAlign: 'center', paddingBottom: 4 },

  /* games */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  game: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 8,
    padding: 8,
    gap: 8,
    ...shadow,
  },
  gameArt: { height: 104, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gameShine: {
    position: 'absolute',
    top: 10,
    left: 14,
    width: 30,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ rotate: '-25deg' }],
  },
  gameEmoji: { fontSize: 56, lineHeight: 68 },
  gameLabel: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, textAlign: 'center', minHeight: 46, textAlignVertical: 'center' },

  doneBadge: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBadgeText: { color: '#fff', fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
});
