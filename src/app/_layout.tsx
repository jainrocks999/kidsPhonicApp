import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useHydrated } from '@/hooks/useHydrated';
import { initAudio } from '@/services/audio';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

  useEffect(() => {
    initAudio().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="parental-gate" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
