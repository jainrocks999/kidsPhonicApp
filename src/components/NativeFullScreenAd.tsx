import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeAd } from 'react-native-google-mobile-ads';
import { ParentalGatePad } from './ParentalGatePad';
import { AD_UNLOCK_MS, gateAdTaps, getAdsModule, setNativeAdPresenter } from '@/services/ads';
import { useT } from '@/i18n';
import { colors, fonts, radius, space } from '@/theme';

/** The ✕ appears after this many seconds (or as soon as a video ad ends). */
const SKIP_AFTER_S = 5;

/**
 * A native ad shown full screen, like an interstitial — but in our own view, so on iOS a
 * transparent layer can catch the child's taps and ask for the parental gate first. After a
 * grown-up passes, the ad itself is tappable for a short time.
 *
 * Mount once at the app root. Ads are loaded ahead of time in services/ads, so this never
 * waits on the network.
 */
export function NativeFullScreenAdHost() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [ad, setAd] = useState<NativeAd | null>(null);
  // AdMob checks asset frames right after they register, so the ad view is only rendered once
  // the Modal has fully appeared ("assets outside native ad view" otherwise).
  const [shown, setShown] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);
  const [unlocked, setUnlocked] = useState(!gateAdTaps);
  const [mediaBox, setMediaBox] = useState({ width: 0, height: 0 });
  const [secondsLeft, setSecondsLeft] = useState(SKIP_AFTER_S);
  const onClosed = useRef<(() => void) | null>(null);

  useEffect(() => {
    setNativeAdPresenter((next, resolve) => {
      // Only one ad at a time.
      if (onClosed.current) {
        next.destroy();
        resolve();
        return;
      }
      onClosed.current = resolve;
      setAd(next);
    });
    return () => {
      setNativeAdPresenter(null);
      onClosed.current?.();
      onClosed.current = null;
    };
  }, []);

  useEffect(() => {
    if (!gateAdTaps || !unlocked) return;
    const timer = setTimeout(() => setUnlocked(false), AD_UNLOCK_MS);
    return () => clearTimeout(timer);
  }, [unlocked]);

  useEffect(() => {
    if (!shown || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [shown, secondsLeft]);

  const ads = getAdsModule();

  // A finished video can be closed right away.
  useEffect(() => {
    if (!ad || !ads) return;
    const sub = ad.addAdEventListener(ads.NativeAdEventType.VIDEO_ENDED, () => setSecondsLeft(0));
    return () => sub.remove();
  }, [ad, ads]);

  if (!ad || !ads) return null;

  const close = () => {
    ad.destroy();
    setAd(null);
    setShown(false);
    setSecondsLeft(SKIP_AFTER_S);
    setGateVisible(false);
    setUnlocked(!gateAdTaps);
    onClosed.current?.();
    onClosed.current = null;
  };

  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = ads;
  const ratio = ad.mediaContent?.aspectRatio || 16 / 9;
  const mediaWidth = Math.min(mediaBox.width, mediaBox.height * ratio);

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onShow={() => setShown(true)}
      onRequestClose={() => {
        if (secondsLeft <= 0) close();
      }}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.adArea}>
          {shown && (
            <NativeAdView nativeAd={ad} style={styles.adView}>
              <View style={styles.header}>
                {!!ad.icon && (
                  <NativeAsset assetType={NativeAssetType.ICON}>
                    <Image source={{ uri: ad.icon.url }} style={styles.icon} />
                  </NativeAsset>
                )}
                <View style={styles.headerText}>
                  <NativeAsset assetType={NativeAssetType.HEADLINE}>
                    <Text style={styles.headline} numberOfLines={2}>
                      {ad.headline}
                    </Text>
                  </NativeAsset>
                  {!!ad.advertiser && (
                    <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                      <Text style={styles.advertiser} numberOfLines={1}>
                        {ad.advertiser}
                      </Text>
                    </NativeAsset>
                  )}
                </View>
                <Text style={styles.badge}>{t('ad_badge')}</Text>
              </View>

              {/* The box takes the free height; the media view keeps the ad's own aspect ratio. */}
              <View style={styles.mediaBox} onLayout={(e) => setMediaBox(e.nativeEvent.layout)}>
                {mediaWidth > 0 && (
                  <NativeMediaView style={{ width: mediaWidth, height: mediaWidth / ratio }} resizeMode="contain" />
                )}
              </View>

              {!!ad.body && (
                <NativeAsset assetType={NativeAssetType.BODY}>
                  <Text style={styles.body} numberOfLines={3}>
                    {ad.body}
                  </Text>
                </NativeAsset>
              )}
              {!!ad.callToAction && (
                <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                  <Text style={styles.cta}>{ad.callToAction}</Text>
                </NativeAsset>
              )}
            </NativeAdView>
          )}

          {/* The child's taps land here, not on the ad. */}
          {!unlocked && <Pressable style={StyleSheet.absoluteFill} onPress={() => setGateVisible(true)} />}
        </View>

        {/* Top-right, like an interstitial: countdown first, then ✕. Sits above the gate layer. */}
        {secondsLeft > 0 ? (
          <View style={[styles.close, { top: insets.top + space.sm }]}>
            <Text style={styles.closeText}>{secondsLeft}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.close, { top: insets.top + space.sm }]}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={t('common_close')}
            onPress={close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        )}

        {/* The gate lives inside this Modal: iOS can't stack two RN Modals reliably. */}
        {gateVisible && (
          <View style={[StyleSheet.absoluteFill, styles.gateBackdrop]}>
            <View style={styles.gateCard}>
              <ParentalGatePad
                onSuccess={() => {
                  setGateVisible(false);
                  setUnlocked(true);
                }}
                onCancel={() => setGateVisible(false)}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  adArea: { flex: 1 },
  adView: { flex: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.md,
    paddingTop: space.md,
    paddingRight: 60, // room for the ✕ button
  },
  icon: { width: 48, height: 48, borderRadius: 10 },
  headerText: { flex: 1, marginLeft: space.md },
  headline: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  advertiser: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  badge: {
    marginLeft: space.sm,
    backgroundColor: colors.yellow,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mediaBox: {
    flex: 1,
    marginTop: space.md,
    marginHorizontal: space.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    marginTop: space.md,
    marginHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cta: {
    marginTop: space.md,
    marginHorizontal: space.md,
    textAlign: 'center',
    backgroundColor: colors.green,
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 20,
    paddingVertical: space.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  close: {
    position: 'absolute',
    right: space.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontFamily: fonts.bold, fontSize: 18 },
  gateBackdrop: { backgroundColor: colors.overlay, justifyContent: 'center', padding: space.md },
  gateCard: { backgroundColor: colors.bg, borderRadius: radius.lg },
});
