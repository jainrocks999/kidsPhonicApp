import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { promptAudio } from '@/assets';
import { getLevel, getUnitStory } from '@/data/curriculum';
import { GAME_META, GAMES_FOR_LEVEL } from '@/features/games/types';
import { play } from '@/services/audio';
import { isUnitComplete, isUnitUnlocked, useProgress } from '@/store/progress';
import { isLevelOwned, useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';

export default function LevelScreen() {
  const t = useT();
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = getLevel(levelId);
  const { lessons, stories, games } = useProgress();
  const { purchases, devMode, language } = useSettings();

  useEffect(() => {
    play(promptAudio('pick_unit', language));
  }, [language]);

  if (!level || !isLevelOwned(level.id, level.isPremium, purchases, devMode)) return <Redirect href="/home" />;
  const accent = levelColors[level.number - 1];

  return (
    <Screen title={t('level_name', level.number, t(`home_level_${level.number}_title` as StringKey))}>
      <ScrollView contentContainerStyle={styles.list}>
        {level.units.map((unit, ui) => {
          const unlocked = devMode || isUnitUnlocked(level, ui, lessons);
          const complete = isUnitComplete(unit, lessons);
          const story = getUnitStory(level, unit);
          return (
            <View key={unit.id} style={[styles.unit, !unlocked && { opacity: 0.55 }]}>
              <View style={styles.unitHeader}>
                <AppText variant="heading" style={{ flex: 1 }}>
                  {t('home_unit_label', unit.number, unit.title)}
                </AppText>
                {complete && <AppText>✅</AppText>}
              </View>
              {!unlocked ? (
                <AppText variant="caption">🔒 {t('home_badge_locked_unlock_after', `Unit ${unit.number - 1}`)}</AppText>
              ) : (
                <>
                  <View style={styles.lessons}>
                    {unit.lessons.map((lesson) => {
                      const stars = lessons[lesson.id];
                      return (
                        <Pressy
                          key={lesson.id}
                          onPress={() => router.push(`/lesson/${lesson.id}`)}
                          style={[styles.lesson, { borderColor: accent, backgroundColor: stars ? accent : colors.surface }]}>
                          <AppText variant="title" style={{ color: stars ? '#fff' : accent, fontSize: lesson.displayLetter.length > 3 ? 18 : 26 }}>
                            {lesson.displayLetter}
                          </AppText>
                          <AppText style={{ fontSize: 11 }}>{stars ? '⭐'.repeat(stars) : ' '}</AppText>
                        </Pressy>
                      );
                    })}
                  </View>

                  <View style={styles.extras}>
                    {story && (
                      <Pressy
                        disabled={!complete && !devMode}
                        onPress={() => router.push(`/story/${story.id}`)}
                        style={[styles.extra, !complete && !devMode && styles.extraLocked]}>
                        <AppText variant="heading">📖 {t('lesson_sheet_story_label')}</AppText>
                        <AppText variant="caption" numberOfLines={1}>
                          {stories[story.id] ? '✅ ' : ''}
                          {story.title}
                        </AppText>
                      </Pressy>
                    )}
                  </View>
                  <AppText variant="caption">🎮 {t('lesson_map_games_label')}</AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                    {GAMES_FOR_LEVEL(level.number).map((g) => {
                      const meta = GAME_META[g];
                      const open = complete || devMode;
                      return (
                        <Pressy
                          key={g}
                          disabled={!open}
                          onPress={() => router.push(`/game/${unit.id}/${g}`)}
                          style={[styles.game, !open && styles.extraLocked]}>
                          <AppText style={{ fontSize: 28 }}>{open ? meta.emoji : '🔒'}</AppText>
                          <AppText variant="caption" numberOfLines={1}>
                            {games[`${unit.id}:${g}`] ? '⭐' : ''}
                            {meta.title.includes('_') ? t(meta.title as StringKey) : meta.title}
                          </AppText>
                        </Pressy>
                      );
                    })}
                  </ScrollView>
                  {!complete && !devMode && <AppText variant="caption">{t('step_guide_story')} · 🔓 🎮</AppText>}
                </>
              )}
            </View>
          );
        })}
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
  extras: { flexDirection: 'row', gap: space.sm },
  extra: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md },
  extraLocked: { opacity: 0.45 },
  game: { width: 96, alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, padding: space.sm, gap: 2 },
});
