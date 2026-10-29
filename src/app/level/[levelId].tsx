import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { NextStopBoard } from '@/components/NextStopBoard';
import { PhonicsTrain, type TrainCar } from '@/components/PhonicsTrain';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { levelImage, promptAudio } from '@/assets';
import { getLevel } from '@/data/curriculum';
import { play } from '@/services/audio';
import { isUnitComplete, levelProgress, useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, levelDark, levelInk, radius, shadow, space, unitColors, unitDark } from '@/theme';

export default function LevelScreen() {
  const t = useT();
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = getLevel(levelId);
  const lessons = useProgress((s) => s.lessons);
  const language = useSettings((s) => s.language);

  useEffect(() => {
    play(promptAudio('pick_unit', language));
  }, [language]);

  if (!level) return <Redirect href="/home" />;

  const accent = levelColors[level.number - 1];
  const dark = levelDark[level.number - 1];
  const overall = levelProgress(level, lessons);

  const cars: TrainCar[] = level.units.map((unit, i) => ({
    key: unit.id,
    number: unit.number,
    title: unit.title,
    color: unitColors[i % unitColors.length],
    edge: unitDark[i % unitDark.length],
    seats: unit.lessons.map((l) => !!lessons[l.id]),
    onPress: () => router.push(`/unit/${unit.id}`),
    accessibilityLabel: t('home_unit_label', unit.number, unit.title),
  }));
  const current = level.units.findIndex((u) => !isUnitComplete(u, lessons));

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

        {/* ---------- next stop: what to play now ---------- */}
        <NextStopBoard
          unit={level.units[current]}
          colorIndex={current}
          done={lessons}
          startLabel={t('home_start_button')}
          replayLabel={t('level_complete_replay')}
          onStart={() => router.push(`/unit/${level.units[current === -1 ? 0 : current].id}`)}
          onLesson={(id) => router.push(`/lesson/${id}`)}
          palette={levelInk[level.number - 1]}
        />

        {/* ---------- units as train cars ---------- */}
        <PhonicsTrain
          levelNumber={level.number}
          color={accent}
          edge={dark}
          cars={cars}
          current={current}
          allDone={current === -1}
          palette={levelInk[level.number - 1]}
          startLabel={t('home_start_button')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, justifyContent: 'space-between', gap: space.lg + 4, paddingTop: space.sm, paddingBottom: space.lg },

  /* banner */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.md,
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
});