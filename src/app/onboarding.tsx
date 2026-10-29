import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Pressy } from '@/components/Pressy';
import { levelImage, promptAudio } from '@/assets';
import { play } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, radius, space } from '@/theme';

const PAGES: { title: StringKey; subtitle: StringKey; image: number }[] = [
  { title: 'onboarding_page1_title', subtitle: 'onboarding_page1_subtitle', image: 1 },
  { title: 'onboarding_page2_title', subtitle: 'onboarding_page2_subtitle', image: 2 },
  { title: 'onboarding_page3_title', subtitle: 'onboarding_page3_subtitle', image: 3 },
  { title: 'onboarding_page4_title', subtitle: 'onboarding_page4_subtitle', image: 4 },
];

export default function Onboarding() {
  const t = useT();
  const { width } = useWindowDimensions();
  const { language, setLanguage, completeOnboarding } = useSettings();
  const [page, setPage] = useState(0);
  const list = useRef<FlatList>(null);
  const last = page === PAGES.length; // final page = language picker

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
    <SafeAreaView style={styles.root}>
      <FlatList
        ref={list}
        data={[...PAGES, null]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            {item ? (
              <>
                <Image source={levelImage(item.image)} style={styles.image} contentFit="contain" />
                <AppText variant="title" style={styles.center}>
                  {t(item.title)}
                </AppText>
                <AppText style={[styles.center, { color: colors.textMuted }]}>{t(item.subtitle)}</AppText>
              </>
            ) : (
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
            )}
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {[...PAGES, null].map((_, i) => (
            <View key={i} style={[styles.dot, i === page && { backgroundColor: colors.primary, width: 24 }]} />
          ))}
        </View>
        <Button label={last ? t('onboarding_get_started') : t('common_next')} onPress={() => (last ? finish() : go(page + 1))} />
        {!last && (
          <Pressy onPress={() => go(PAGES.length)} style={{ alignSelf: 'center', padding: space.sm }}>
            <AppText variant="caption">{t('common_skip')}</AppText>
          </Pressy>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  image: { width: 220, height: 220 },
  center: { textAlign: 'center' },
  lang: { alignSelf: 'stretch', padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 3, borderColor: 'transparent' },
  langOn: { borderColor: colors.primary },
  footer: { padding: space.lg, gap: space.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
});
