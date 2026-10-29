import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { levelImage, promptAudio, sfx } from '@/assets';
import { getLevel } from '@/data/curriculum';
import { play, playSfx } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, space } from '@/theme';

export default function LevelComplete() {
  const t = useT();
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = getLevel(levelId);
  const language = useSettings((s) => s.language);

  useEffect(() => {
    playSfx(sfx.complete);
    play(promptAudio('unit_done', language));
  }, [language]);

  if (!level) return <Redirect href="/home" />;
  const accent = levelColors[level.number - 1];
  const title = t(`home_level_${level.number}_title` as StringKey);
  const count = level.units.reduce((n, u) => n + u.lessons.length, 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: accent + '22' }]}>
      <Animated.View entering={ZoomIn.springify()} style={styles.center}>
        <Image source={levelImage(level.number)} style={styles.image} contentFit="contain" />
        <AppText variant="title" style={{ fontSize: 34, textAlign: 'center' }}>
          {t('level_complete_title')}
        </AppText>
        <AppText variant="heading" style={{ textAlign: 'center', color: accent }}>
          {t('level_complete_subtitle', title)}
        </AppText>
        <AppText style={{ fontSize: 40 }}>⭐⭐⭐</AppText>
        <AppText variant="heading">{t('level_complete_letter_count', count)}</AppText>
      </Animated.View>
      <View style={styles.actions}>
        <Button label={t('level_complete_go_home')} color={accent} onPress={() => router.dismissTo('/home')} />
        <Button label={t('level_complete_replay')} variant="outline" color={accent} onPress={() => router.replace(`/level/${level.id}`)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: space.lg, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  image: { width: 200, height: 200 },
  actions: { gap: space.sm },
});
