import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { ProgressBar } from '@/components/ProgressBar';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { levelImage, promptAudio } from '@/assets';
import { getLevel, getUnitStory } from '@/data/curriculum';
import { GAME_META, GAMES_FOR_LEVEL } from '@/features/games/types';
import { play } from '@/services/audio';
import { isUnitComplete, levelProgress, useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, levelDark, radius, shadow, space } from '@/theme';

const COLS = 4;
const GAME_COLS = 3;

export default function LevelScreen() {
  const t = useT();
  const { width } = useWindowDimensions();
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = getLevel(levelId);
  const { lessons, stories, games } = useProgress();
  const language = useSettings((s) => s.language);

  useEffect(() => {
    play(promptAudio('pick_unit', language));
  }, [language]);

  if (!level) return <Redirect href="/home" />;

  const accent = levelColors[level.number - 1];
  const dark = levelDark[level.number - 1];
  const overall = levelProgress(level, lessons);

  // screen padding (lg*2) + unit body padding (md*2) + gaps between tiles
  const inner = width - space.lg * 2 - space.md * 2;
  const tile = Math.floor((inner - space.sm * (COLS - 1)) / COLS);
  const gameTile = Math.floor((inner - space.sm * (GAME_COLS - 1)) / GAME_COLS);

  return (
    <Screen
      theme="candySky"
      title={t('level_name', level.number, t(`home_level_${level.number}_title` as StringKey))}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* ---------- level banner ---------- */}
        <View style={[styles.banner, { backgroundColor: accent, borderBottomColor: dark }]}>
          <View style={[styles.bubble, { top: -24, left: -20, width: 90, height: 90 }]} />
          <View style={[styles.bubble, { bottom: -30, right: 70, width: 70, height: 70 }]} />

          <View style={styles.bannerInfo}>
            <View style={styles.topRow}>
              <View style={[styles.numCircle, { borderBottomColor: dark }]}>
                <AppText variant="heading" style={{ color: accent }}>{level.number}</AppText>
              </View>
              <AppText variant="caption" style={styles.age}>{level.ageRange}</AppText>
            </View>
            <AppText variant="heading" style={{ color: '#fff' }} numberOfLines={2}>
              {t(`home_level_${level.number}_title` as StringKey)}
            </AppText>
            <View style={styles.progressRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={overall} color={colors.yellow} height={10} />
              </View>
              <AppText variant="caption" style={{ color: '#fff' }}>{Math.round(overall * 100)}%</AppText>
            </View>
          </View>

          <View style={[styles.imageWrap, { borderColor: dark, transform: [{ rotate: '3deg' }] }]}>
            <Image source={levelImage(level.number)} style={styles.image} contentFit="contain" />
          </View>
        </View>

        {/* ---------- units ---------- */}
        {level.units.map((unit) => {
          const complete = isUnitComplete(unit, lessons);
          const done = unit.lessons.filter((l) => lessons[l.id]).length;
          const story = getUnitStory(level, unit);
          const headColor = complete ? colors.green : accent;
          const edgeColor = complete ? '#13A850' : dark;

          return (
            <View key={unit.id} style={[styles.unit, { borderBottomColor: edgeColor }]}>
              {/* coloured header */}
              <View style={[styles.unitHead, { backgroundColor: headColor }]}>
                <View style={styles.unitNum}>
                  <AppText variant="heading" style={{ color: headColor }}>
                    {complete ? '✓' : unit.number}
                  </AppText>
                </View>
                <AppText variant="heading" style={{ flex: 1, color: '#fff' }} numberOfLines={2}>
                  {t('home_unit_label', unit.number, unit.title)}
                </AppText>
                <View style={styles.countPill}>
                  <AppText variant="caption" style={{ color: edgeColor }}>
                    {done}/{unit.lessons.length}
                  </AppText>
                </View>
              </View>

              <View style={styles.unitBody}>
                <ProgressBar value={done / unit.lessons.length} color={headColor} height={8} />

                {/* lessons */}
                <View style={styles.lessons}>
                  {unit.lessons.map((lesson, i) => {
                    const stars = lessons[lesson.id];
                    const len = lesson.displayLetter.length;
                    return (
                      <Pressy
                        key={lesson.id}
                        onPress={() => router.push(`/lesson/${lesson.id}`)}
                        accessibilityLabel={t('lesson_sheet_lesson_label', i + 1, lesson.displayLetter)}
                        style={[
                          styles.lesson,
                          { width: tile, height: tile + 6 },
                          stars
                            ? { backgroundColor: accent, borderColor: accent, borderBottomColor: dark }
                            : { backgroundColor: '#fff', borderColor: accent + '55', borderBottomColor: accent },
                        ]}>
                        <AppText
                          variant="title"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          style={{
                            color: stars ? '#fff' : accent,
                            fontSize: len > 3 ? 16 : len > 1 ? 24 : 32,
                            textAlign: 'center',
                          }}>
                          {lesson.displayLetter}
                        </AppText>
                        <AppText style={{ fontSize: 11, height: 14 }}>{stars ? '⭐'.repeat(stars) : ''}</AppText>
                      </Pressy>
                    );
                  })}
                </View>

                {/* story */}
                {story && (
                  <Pressy onPress={() => router.push(`/story/${story.id}`)} style={styles.story}>
                    <View style={[styles.bubble, { top: -20, left: -16, width: 70, height: 70 }]} />
                    <View style={styles.storyIcon}>
                      <AppText style={{ fontSize: 30 }}>📖</AppText>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="caption" style={{ color: '#fff', opacity: 0.9 }}>
                        {t('lesson_sheet_story_label')}
                      </AppText>
                      <AppText variant="heading" numberOfLines={1} style={{ color: '#fff' }}>
                        {story.title}
                      </AppText>
                    </View>
                    <View style={styles.playBtn}>
                      <AppText style={{ fontSize: 18, color: '#D98A00' }}>{stories[story.id] ? '✓' : '▶'}</AppText>
                    </View>
                  </Pressy>
                )}

                {/* games */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <AppText variant="caption" style={styles.gamesLabel}>🎮 {t('lesson_map_games_label')}</AppText>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.games}>
                  {GAMES_FOR_LEVEL(level.number).map((g) => {
                    const meta = GAME_META[g];
                    const played = !!games[`${unit.id}:${g}`];
                    return (
                      <Pressy
                        key={g}
                        onPress={() => router.push(`/game/${unit.id}/${g}`)}
                        style={[styles.game, { width: gameTile, borderColor: accent + '33', borderBottomColor: accent }]}>
                        {played && (
                          <View style={styles.gameStar}>
                            <AppText style={{ fontSize: 12 }}>⭐</AppText>
                          </View>
                        )}
                        <View style={[styles.gameIcon, { backgroundColor: accent + '22' }]}>
                          <AppText style={{ fontSize: 28 }}>{meta.emoji}</AppText>
                        </View>
                        <AppText variant="caption" numberOfLines={2} style={styles.gameLabel}>
                          {meta.title.includes('_') ? t(meta.title as StringKey) : meta.title}
                        </AppText>
                      </Pressy>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}

        {/* ---------- review ---------- */}
        <View style={styles.review}>
          <AppText style={{ fontSize: 30 }}>📝</AppText>
          <AppText variant="heading">{t('review_title')}</AppText>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            {t('review_coming_soon')} — {t('review_coming_soon_description')}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 3 },

  /* banner */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    borderBottomWidth: 8,
    padding: space.md,
    overflow: 'hidden',
    ...shadow,
  },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  bannerInfo: { flex: 1, gap: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    borderBottomWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  age: { color: '#fff', opacity: 0.95 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: 82, height: 82 },

  /* unit */
  unit: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderBottomWidth: 7,
    ...shadow,
  },
  unitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  unitNum: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  unitBody: { padding: space.md, gap: space.sm + 2 },

  /* lessons */
  lessons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  lesson: {
    borderRadius: radius.md,
    borderWidth: 3,
    borderBottomWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  /* story */
  story: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: '#FFB020',
    borderRadius: radius.lg,
    borderBottomWidth: 7,
    borderBottomColor: '#D98A00',
    padding: space.md,
    overflow: 'hidden',
  },
  storyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* games */
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  dividerLine: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border },
  gamesLabel: { color: colors.textMuted },
  games: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  game: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 6,
    paddingVertical: space.sm + 2,
    paddingHorizontal: 6,
    gap: 6,
  },
  gameIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameLabel: { color: colors.text, textAlign: 'center', minHeight: 32 },
  gameStar: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...shadow,
  },

  /* review */
  review: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.locked,
    padding: space.lg,
  },
});