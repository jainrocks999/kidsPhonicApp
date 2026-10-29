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
import { isLevelOwned, useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, radius, shadow, space } from '@/theme';

export default function Home() {
  const t = useT();
  const lessons = useProgress((s) => s.lessons);
  const { purchases, devMode, language } = useSettings();
  const allOwned = levels.every((l) => isLevelOwned(l.id, l.isPremium, purchases, devMode));

  useEffect(() => {
    play(promptAudio('pick_level', language));
  }, [language]);

  return (
    <Screen
      title={t('home_title')}
      back={false}
      right={<IconButton icon="⚙️" onPress={() => openGated('/settings')} accessibilityLabel={t('nav_settings')} />}>
      <ScrollView contentContainerStyle={styles.list}>
        {levels.map((level, i) => {
          const owned = isLevelOwned(level.id, level.isPremium, purchases, devMode);
          const progress = levelProgress(level, lessons);
          const accent = levelColors[i];
          const badge = !owned ? t('home_badge_locked') : progress > 0 ? t('home_badge_active') : t('home_badge_ready');
          return (
            <Pressy
              key={level.id}
              onPress={() => {
                if (owned) router.push(`/level/${level.id}`);
                else {
                  play(promptAudio('locked', language));
                  openGated(`/paywall?level=${level.id}`);
                }
              }}
              style={[styles.card, { borderColor: accent }]}>
              <View style={[styles.imageWrap, { backgroundColor: accent + '22' }]}>
                <Image source={levelImage(level.number)} style={styles.image} contentFit="contain" />
                {!owned && <AppText style={styles.lock}>🔒</AppText>}
              </View>
              <View style={styles.info}>
                <AppText variant="caption" style={{ color: accent }}>
                  {t('level_name', level.number, '').replace(/:\s*$/, '')} · {level.ageRange}
                </AppText>
                <AppText variant="heading">{t(`home_level_${level.number}_title` as StringKey)}</AppText>
                <View style={[styles.badge, { backgroundColor: owned ? accent : colors.locked }]}>
                  <AppText variant="caption" style={{ color: '#fff' }}>
                    {badge}
                  </AppText>
                </View>
                <ProgressBar value={progress} color={accent} height={8} />
              </View>
            </Pressy>
          );
        })}

        {!allOwned && (
          <Pressy onPress={() => openGated('/paywall?level=ALL')} style={styles.bundle}>
            <AppText variant="heading" style={{ color: '#fff', textAlign: 'center' }}>
              ✨ {t('home_unlock_bundle')}
            </AppText>
          </Pressy>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md },
  card: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    padding: space.md,
    alignItems: 'center',
    ...shadow,
  },
  imageWrap: { width: 96, height: 96, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  image: { width: 84, height: 84 },
  lock: { position: 'absolute', right: -6, bottom: -6, fontSize: 28 },
  info: { flex: 1, gap: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill },
  bundle: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.lg, ...shadow },
});
