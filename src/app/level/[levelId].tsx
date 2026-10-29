import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { PackDownload } from '@/components/PackDownload';
import { ProgressBar } from '@/components/ProgressBar';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { promptAudio } from '@/assets';
import { getLevel, getUnitStory } from '@/data/curriculum';
import { GAME_META, GAMES_FOR_LEVEL } from '@/features/games/types';
import { play } from '@/services/audio';
import { packId } from '@/services/content';
import { isUnitComplete, useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';

export default function LevelScreen() {
  const t = useT();
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = getLevel(levelId);
  const { lessons, stories, games } = useProgress();
  const language = useSettings((s) => s.language);

  useEffect(() => {
    play(promptAudio('pick_unit', language));
  }, [language]);

  if (!level) return <Redirect href="/home" />;
  const accent = levelColors[level.number - 1];

  return (
    <Screen title={t('level_name', level.number, t(`home_level_${level.number}_title` as StringKey))}>
      <ScrollView contentContainerStyle={styles.list}>
        {level.units.map((unit) => {
          const complete = isUnitComplete(unit, lessons);
          const done = unit.lessons.filter((l) => lessons[l.id]).length;
          const story = getUnitStory(level, unit);
          return (
            <View key={unit.id} style={styles.unit}>
              <View style={styles.unitHeader}>
                <AppText variant="heading" style={{ flex: 1 }}>
                  {t('home_unit_label', unit.number, unit.title)}
                </AppText>
                {complete && <AppText>✅</AppText>}
              </View>
              <ProgressBar value={done / unit.lessons.length} color={accent} height={6} />
              <PackDownload pack={packId(level.number, unit.number)} accent={accent} />

              <View style={styles.lessons}>
                {unit.lessons.map((lesson, i) => {
                  const stars = lessons[lesson.id];
                  return (
                    <Pressy
                      key={lesson.id}
                      onPress={() => router.push(`/lesson/${lesson.id}`)}
                      accessibilityLabel={t('lesson_sheet_lesson_label', i + 1, lesson.displayLetter)}
                      style={[styles.lesson, { borderColor: accent, backgroundColor: stars ? accent : colors.surface }]}>
                      <AppText variant="title" style={{ color: stars ? '#fff' : accent, fontSize: lesson.displayLetter.length > 3 ? 18 : 26 }}>
                        {lesson.displayLetter}
                      </AppText>
                      <AppText style={{ fontSize: 11 }}>{stars ? '⭐'.repeat(stars) : ' '}</AppText>
                    </Pressy>
                  );
                })}
              </View>

              {story && (
                <Pressy onPress={() => router.push(`/story/${story.id}`)} style={styles.extra}>
                  <AppText variant="heading">📖 {t('lesson_sheet_story_label')}</AppText>
                  <AppText variant="caption" numberOfLines={1}>
                    {stories[story.id] ? '✅ ' : ''}
                    {story.title}
                  </AppText>
                </Pressy>
              )}
              <AppText variant="caption">🎮 {t('lesson_map_games_label')}</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {GAMES_FOR_LEVEL(level.number).map((g) => {
                  const meta = GAME_META[g];
                  return (
                    <Pressy key={g} onPress={() => router.push(`/game/${unit.id}/${g}`)} style={styles.game}>
                      <AppText style={{ fontSize: 28 }}>{meta.emoji}</AppText>
                      <AppText variant="caption" numberOfLines={1}>
                        {games[`${unit.id}:${g}`] ? '⭐' : ''}
                        {meta.title.includes('_') ? t(meta.title as StringKey) : meta.title}
                      </AppText>
                    </Pressy>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        <View style={[styles.unit, { alignItems: 'center' }]}>
          <AppText variant="heading">📝 {t('review_title')}</AppText>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            {t('review_coming_soon')} — {t('review_coming_soon_description')}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md },
  unit: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, ...shadow },
  unitHeader: { flexDirection: 'row', alignItems: 'center' },
  lessons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  lesson: { minWidth: 72, height: 72, paddingHorizontal: 8, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  extra: { backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md },
  game: { width: 96, alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, padding: space.sm, gap: 2 },
});
