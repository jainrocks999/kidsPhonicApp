import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UpdateBanner } from '@/components/UpdateBanner';
import { useHydrated } from '@/hooks/useHydrated';
import { initCrashReporting, logScreen } from '@/services/analytics';
import { initAppUpdates } from '@/services/appUpdate';
import { initAudio } from '@/services/audio';
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
    return initAppUpdates();
  }, []);

  useEffect(() => {
    // Route patterns, not raw ids, keep the analytics screen list small.
    logScreen(pathname.replace(/\/(L\dU\d+[^/]*|L\d_S\d+|L\d)(?=\/|$)/g, '/[id]'));
  }, [pathname]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="parental-gate" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="level-complete/[levelId]" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <UpdateBanner />
    </GestureHandlerRootView>
  );
}
