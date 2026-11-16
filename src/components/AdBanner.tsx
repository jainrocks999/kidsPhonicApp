import { Platform, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import monetization from '../../monetization.config.json';
import { adRequestOptions, getAdsModule, useAdsReady } from '@/services/ads';
import { usePurchases } from '@/store/purchases';

/** No banner before home, on the parent-only purchase flow, or where an interstitial runs. */
const NO_BANNER = /^\/(onboarding|parental-gate|paywall|level-complete)?(\/|$)/;

function useBannerVisible() {
  const pathname = usePathname();
  const ready = useAdsReady((s) => s.ready);
  const noAds = usePurchases((s) => s.noAds);
  return !!getAdsModule() && ready && !noAds && !NO_BANNER.test(pathname);
}

/**
 * Bottom safe-area space a screen has to keep free itself. While the ad banner shows it sits
 * below the screens (never over them) and covers the bottom inset, so screens need none.
 */
export function useBottomInset() {
  const visible = useBannerVisible();
  const insets = useSafeAreaInsets();
  return visible ? 0 : insets.bottom;
}

/**
 * The single banner of the app: rendered once in the root layout, in normal flow below the
 * navigator, so it takes its own space and never overlaps a screen.
 */
export function BottomAdBanner({ backgroundColor }: { backgroundColor: string }) {
  const visible = useBannerVisible();
  const insets = useSafeAreaInsets();
  const ads = getAdsModule();
  if (!ads || !visible) return null;

  const { BannerAd, BannerAdSize } = ads;
  const unitId =
    Platform.OS === 'ios' ? monetization.admob.iosBannerUnitId : monetization.admob.androidBannerUnitId;

  return (
    <View style={[styles.wrap, { backgroundColor, paddingBottom: insets.bottom }]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        requestOptions={adRequestOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
