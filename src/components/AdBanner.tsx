import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import monetization from '../../monetization.config.json';
import { getAdsModule } from '@/services/ads';
import { usePurchases } from '@/store/purchases';
import { space } from '@/theme';

export function AdBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const noAds = usePurchases((s) => s.noAds);
  const ads = getAdsModule();
  if (!ads || noAds) return null;

  const { BannerAd, BannerAdSize } = ads;
  const unitId =
    Platform.OS === 'ios' ? monetization.admob.iosBannerUnitId : monetization.admob.androidBannerUnitId;

  return (
    <View style={[styles.wrap, style]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: space.sm },
});
