import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { levelImage, promptAudio } from '@/assets';
import { play } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, levelColors, levelDark, radius, shadow, space } from '@/theme';

const PAGES: { title: StringKey; subtitle: StringKey; image: number }[] = [
  { title: 'onboarding_page1_title', subtitle: 'onboarding_page1_subtitle', image: 1 },
  { title: 'onboarding_page2_title', subtitle: 'onboarding_page2_subtitle', image: 2 },
  { title: 'onboarding_page3_title', subtitle: 'onboarding_page3_subtitle', image: 3 },
  { title: 'onboarding_page4_title', subtitle: 'onboarding_page4_subtitle', image: 4 },
];

export default function Onboarding() {
  const t = useT();
  const { width } = useWindowDimensions();
  const { language, /* setLanguage, */ completeOnboarding } = useSettings();
  const [page, setPage] = useState(0);
  const list = useRef<FlatList>(null);
  // English-only for now: the language-picker page (commented out below) used to be the final page.
  const last = page === PAGES.length - 1;

  const accent = levelColors[Math.min(page, PAGES.length - 1)];

  const go = (n: number) => {
    list.current?.scrollToIndex({ index: n, animated: true });
    setPage(n);
    if (n === 0) play(promptAudio('welcome', language));
  };

  const finish = () => {
    completeOnboarding();
    play(promptAudio('lets_go', language));
    router.replace('/home');
  };

  return (
    <Screen back={false}>
      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <View style={[styles.page, { width }]}>
            <View style={styles.card}>
              <View
                style={[
                  styles.imageWrap,
                  { borderColor: levelColors[index], borderBottomColor: levelDark[index], transform: [{ rotate: index % 2 === 0 ? '-3deg' : '3deg' }] },
                ]}>
                <Image source={levelImage(item.image)} style={styles.image} contentFit="contain" />
              </View>
              <AppText variant="title" style={[styles.center, { color: levelDark[index] }]}>
                {t(item.title)}
              </AppText>
              <AppText style={[styles.center, { color: colors.textMuted }]}>{t(item.subtitle)}</AppText>
            </View>
            {/* Language picker — was a 5th page (data={[...PAGES, null]}, shown when item is null).
            <>
              <AppText style={{ fontSize: 80 }}>🌏</AppText>
              <AppText variant="title" style={styles.center}>
                {t('onboarding_language_title')}
              </AppText>
              {(['en', 'vi'] as const).map((l) => (
                <Pressy key={l} onPress={() => setLanguage(l)} style={[styles.lang, language === l && styles.langOn]}>
                  <AppText variant="heading">
                    {l === 'en' ? '🇬🇧  English' : '🇻🇳  Tiếng Việt'} {language === l ? '✓' : ''}
                  </AppText>
                </Pressy>
              ))}
            </>
            */}
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && { backgroundColor: accent, width: 24 }]} />
          ))}
        </View>
        <Button color={accent} label={last ? t('onboarding_get_started') : t('common_next')} onPress={() => (last ? finish() : go(page + 1))} />
        {!last && (
          <Pressy onPress={finish} style={styles.skip}>
            <AppText variant="caption" style={{ color: colors.primaryDark }}>{t('common_skip')}</AppText>
          </Pressy>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  // Same chunky 3D card as the home/level screens: white rim + thick bottom edge.
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    ...shadow,
  },
  imageWrap: {
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderBottomWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  image: { width: 184, height: 184 },
  center: { textAlign: 'center' },
  // lang / langOn: used by the commented-out language picker.
  lang: { alignSelf: 'stretch', padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 3, borderColor: 'transparent' },
  langOn: { borderColor: colors.primary },
  footer: { padding: space.lg, gap: space.sm },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: space.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  skip: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
});
