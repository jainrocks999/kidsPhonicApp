import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ParentalGatePad } from "./ParentalGatePad";
import {
  AD_UNLOCK_MS,
  adRequestOptions,
  adUnitIds,
  gateAdTaps,
  getAdsModule,
  pauseBannerAfterFailure,
  useAdsReady,
} from "@/services/ads";
import { usePurchases } from "@/store/purchases";
import { colors, radius, space } from "@/theme";

/** No banner before home, on the parent-only purchase flow, or where an interstitial runs. */
const NO_BANNER = /^\/(onboarding|parental-gate|paywall|level-complete)?(\/|$)/;

function useBannerVisible() {
  const pathname = usePathname();
  const ready = useAdsReady((s) => s.ready);
  const paused = useAdsReady((s) => s.bannerPaused);
  const noAds = usePurchases((s) => s.noAds);
  return (
    !!getAdsModule() && ready && !paused && !noAds && !NO_BANNER.test(pathname)
  );
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
export function BottomAdBanner({
  backgroundColor,
}: {
  backgroundColor: string;
}) {
  const visible = useBannerVisible();
  const insets = useSafeAreaInsets();
  const ads = getAdsModule();
  const [gateVisible, setGateVisible] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Passing the gate lets the grown-up tap the ad itself for a short time.
  useEffect(() => {
    if (!unlocked) return;
    const timer = setTimeout(() => setUnlocked(false), AD_UNLOCK_MS);
    return () => clearTimeout(timer);
  }, [unlocked]);

  const unitId = adUnitIds().banner;
  if (!ads || !visible || !unitId) return null;

  const { BannerAd, BannerAdSize } = ads;

  return (
    <View
      style={[styles.wrap, { backgroundColor, paddingBottom: insets.bottom }]}
    >
      <View>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.BANNER}
          requestOptions={adRequestOptions}

          onAdFailedToLoad={pauseBannerAfterFailure}
          onAdOpened={() => setUnlocked(false)}
        />
        {/* The child's taps land here, not on the ad. */}
        {gateAdTaps && !unlocked && (
          <Pressable
            style={StyleSheet.absoluteFill}
            accessible={false}
            onPress={() => setGateVisible(true)}
          />
        )}
      </View>
      {gateAdTaps && (
        <Modal
          visible={gateVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGateVisible(false)}
        >
          <View style={styles.gateBackdrop}>
            <View style={styles.gateCard}>
              {gateVisible && (
                <ParentalGatePad
                  onSuccess={() => {
                    setGateVisible(false);
                    setUnlocked(true);
                  }}
                  onCancel={() => setGateVisible(false)}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  gateBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: space.md,
  },
  gateCard: { backgroundColor: colors.bg, borderRadius: radius.lg },
});
