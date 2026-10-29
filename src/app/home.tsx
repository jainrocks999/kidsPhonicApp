import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { levelImage, promptAudio } from '@/assets';
import { levels } from '@/data/curriculum';
import { openGated } from '@/features/parental';
import { play } from '@/services/audio';
import { levelProgress, useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, levelDark, radius, shadow, space } from '@/theme';

export default function Home() {
  const t = useT();
  const lessons = useProgress((s) => s.lessons);
  const language = useSettings((s) => s.language);

  useEffect(() => {
    play(promptAudio('pick_level', language));
  }, [language]);

  const all = levels.map((l) => levelProgress(l, lessons));
  const overall = Math.round((all.reduce((a, b) => a + b, 0) / Math.max(all.length, 1)) * 100);

  return (
    <Screen
      theme="candySky"
      title={t('home_title')}
      back={false}
      right={<IconButton icon="⚙️" onPress={() => openGated('/settings')} accessibilityLabel={t('nav_settings')} />}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <AppText variant="heading" style={styles.summaryStar}>⭐</AppText>
          <View style={{ flex: 1, gap: 6 }}>
            <ProgressBar value={overall / 100} color={colors.yellow} height={12} />
          </View>
          <AppText variant="heading" style={{ color: colors.primaryDark }}>{overall}%</AppText>
        </View>

        {levels.map((level, i) => {
          const progress = levelProgress(level, lessons);
          const accent = levelColors[i];
          const dark = levelDark[i];
          const badge = progress >= 1 ? t('common_completed') : progress > 0 ? t('home_badge_active') : t('home_badge_ready');
          const tilt = i % 2 === 0 ? '-3deg' : '3deg';

          return (
            <Pressy
              key={level.id}
              onPress={() => router.push(`/level/${level.id}`)}
              style={[styles.card, { backgroundColor: accent, borderBottomColor: dark }]}>
              <View style={[styles.bubble, { top: -24, left: -20, width: 90, height: 90 }]} />
              <View style={[styles.bubble, { bottom: -30, right: 70, width: 70, height: 70 }]} />

              <View style={styles.info}>
                <View style={styles.topRow}>
                  <View style={[styles.numCircle, { borderColor: dark }]}>
                    <AppText variant="heading" style={{ color: accent }}>{level.number}</AppText>
                  </View>
                  <AppText variant="caption" style={styles.age}>{level.ageRange}</AppText>
                </View>

                <AppText variant="heading" style={styles.title} numberOfLines={2}>
                  {t(`home_level_${level.number}_title` as StringKey)}
                </AppText>

                <View style={styles.badge}>
                  <AppText variant="caption" style={{ color: dark }}>{badge}</AppText>
                </View>

                <ProgressBar value={progress} color={colors.yellow} height={10} />
              </View>

              <View style={[styles.imageWrap, { transform: [{ rotate: tilt }], borderColor: dark }]}>
                <Image source={levelImage(level.number)} style={styles.image} contentFit="contain" />
              </View>
            </Pressy>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    ...shadow,
  },
  summaryStar: { fontSize: 22 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    borderBottomWidth: 8,   // 3D chunky edge
    padding: space.md,
    overflow: 'hidden',
    ...shadow,
  },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },

  info: { flex: 1, gap: 8 },
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
  title: { color: '#fff' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },

  imageWrap: {
    width: 104,
    height: 104,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: 90, height: 90 },
});