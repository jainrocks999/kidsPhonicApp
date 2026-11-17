import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomAdBanner } from '@/components/AdBanner';
import { IntroSplash } from '@/components/IntroSplash';
import { NativeFullScreenAdHost } from '@/components/NativeFullScreenAd';
import { sceneGroundColor } from '@/components/Screen';
import { UpdateBanner } from '@/components/UpdateBanner';
import { useHydrated } from '@/hooks/useHydrated';
import { initCrashReporting, logScreen } from '@/services/analytics';
import { initActivity, reportTouch } from '@/services/activity';
import { initAds } from '@/services/ads';
import { initAppUpdates } from '@/services/appUpdate';
import { initAudio } from '@/services/audio';
import { closeIAP, initIAP } from '@/services/iap';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
initCrashReporting();

export default function RootLayout() {
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: require('../../rn_assets/fonts/quicksand_regular.ttf'),
    [fonts.bold]: require('../../rn_assets/fonts/quicksand_bold.ttf'),
    [fonts.sans]: require('../../rn_assets/fonts/google_sans_regular.ttf'),
    [fonts.sansMedium]: require('../../rn_assets/fonts/google_sans_medium.ttf'),
    [fonts.sansBold]: require('../../rn_assets/fonts/google_sans_bold.ttf'),
  });
  const ready = hydrated && (fontsLoaded || !!fontError);

  const pathname = usePathname();

  useEffect(() => {
    initAudio().catch(() => {});
    initIAP().catch(() => {});
    initActivity().catch(() => {});
    initAds().catch(() => {});
    const stopUpdates = initAppUpdates();
    return () => {
      stopUpdates();
      void closeIAP();
    };
  }, []);

  useEffect(() => {
    // Route patterns, not raw ids, keep the analytics screen list small.
    logScreen(pathname.replace(/\/(L\dU\d+[^/]*|L\d_S\d+|L\d)(?=\/|$)/g, '/[id]'));
  }, [pathname]);

  // The native splash is hidden by <IntroSplash> once the intro video's first frame is up.
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  const [groundColor] = useState(() => sceneGroundColor());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {ready && (
        <>
          <View
            style={{ flex: 1 }}
            onStartShouldSetResponderCapture={() => {
              reportTouch();
              return false;
            }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
              <Stack.Screen name="parental-gate" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="level-complete/[levelId]" options={{ animation: 'fade', gestureEnabled: false }} />
            </Stack>
            <UpdateBanner />
          </View>
          {/* Outside the screens' view: takes its own space, in the colour of the scene's ground. */}
          <BottomAdBanner backgroundColor={groundColor} />
          <NativeFullScreenAdHost />
        </>
      )}
      {!introDone && <IntroSplash appReady={ready} onDone={finishIntro} />}
    </GestureHandlerRootView>
  );
}
