import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import type { Product } from 'expo-iap';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { buyProduct, iapAvailable, restoreAllPurchases } from '@/services/iap';
import { PRODUCT_ALL_LEVELS, PRODUCT_NO_ADS, usePurchases, type ProductId } from '@/store/purchases';
import { useT } from '@/i18n';
import { colors, fonts, radius, shadow, space } from '@/theme';

const extra = (Constants.expoConfig?.extra ?? {}) as { privacyUrl?: string; termsUrl?: string };

const priceFor = (products: Product[], id: ProductId) =>
  products.find((product) => product.id === id)?.displayPrice ?? '—';

function Feature({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <View style={styles.feature}>
      <AppText style={styles.featureEmoji}>{emoji}</AppText>
      <View style={{ flex: 1 }}>
        <AppText style={styles.featureTitle}>{title}</AppText>
        <AppText variant="caption" style={styles.featureText}>{text}</AppText>
      </View>
    </View>
  );
}

function PlanCard({
  label,
  badge,
  description,
  price,
  cta,
  onPress,
  disabled,
  highlight,
}: {
  label: string;
  badge?: string;
  description: string;
  price: string;
  cta: string;
  onPress: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.plan, highlight && styles.planHighlight]}>
      {!!badge && (
        <View style={styles.badge}>
          <AppText variant="caption" style={styles.badgeText}>{badge}</AppText>
        </View>
      )}
      <View style={styles.planTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText style={styles.planLabel}>{label}</AppText>
          <AppText variant="caption" style={styles.planDesc}>{description}</AppText>
        </View>
        <AppText variant="heading" style={styles.price}>{price}</AppText>
      </View>
      <Button
        label={cta}
        onPress={onPress}
        disabled={disabled}
        color={highlight ? colors.green : colors.primary}
      />
    </View>
  );
}

export default function Paywall() {
  const t = useT();
  const noAds = usePurchases((s) => s.noAds);
  const allLevels = usePurchases((s) => s.allLevels);
  const products = usePurchases((s) => s.products);
  const buying = usePurchases((s) => s.buying);
  const restoring = usePurchases((s) => s.restoring);
  const [thanks, setThanks] = useState(false);
  const previous = useRef({ noAds, allLevels });

  useEffect(() => {
    const gained = (!previous.current.noAds && noAds) || (!previous.current.allLevels && allLevels);
    previous.current = { noAds, allLevels };
    if (gained) setThanks(true);
  }, [noAds, allLevels]);

  const buy = (id: ProductId) => {
    if (!iapAvailable) {
      Alert.alert(t('common_warning'), t('error_no_available_this_device'));
      return;
    }
    void buyProduct(id);
  };

  const restore = () => {
    if (!iapAvailable) {
      Alert.alert(t('common_warning'), t('error_no_available_this_device'));
      return;
    }
    void restoreAllPurchases().then((found) =>
      Alert.alert(found ? t('paywall_restore_success') : t('paywall_error_no_subscription_to_restore')),
    );
  };

  const busy = buying !== null || restoring;
  const unavailable = !iapAvailable || products.length === 0;

  return (
    <Screen title={t('paywall_title')}>
      <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <AppText style={styles.heroEmoji}>🚀</AppText>
          <AppText variant="caption" style={styles.heroText}>{t('paywall_subtitle_all')}</AppText>
        </View>

        {thanks && (
          <View style={styles.thanks}>
            <AppText style={styles.thanksText}>✓ {t('paywall_purchase_success')}</AppText>
          </View>
        )}

        <View style={styles.features}>
          <Feature emoji="🚫" title={t('paywall_feature_no_ads')} text={t('paywall_feature_no_ads_desc')} />
          <Feature emoji="🔓" title={t('paywall_feature_all_levels')} text={t('paywall_feature_all_levels_desc')} />
        </View>

        {!allLevels && (
          <PlanCard
            highlight
            label={t('paywall_plan_bundle_label')}
            badge={t('paywall_plan_bundle_badge')}
            description={t('paywall_feature_all_levels_desc')}
            price={priceFor(products, PRODUCT_ALL_LEVELS)}
            cta={buying === PRODUCT_ALL_LEVELS ? t('common_loading') : t('paywall_subscribe')}
            disabled={busy || unavailable}
            onPress={() => buy(PRODUCT_ALL_LEVELS)}
          />
        )}

        {!noAds && (
          <PlanCard
            label={t('paywall_plan_no_ads_label')}
            badge={t('paywall_plan_no_ads_badge')}
            description={t('paywall_feature_no_ads_desc')}
            price={priceFor(products, PRODUCT_NO_ADS)}
            cta={buying === PRODUCT_NO_ADS ? t('common_loading') : t('paywall_subscribe')}
            disabled={busy || unavailable}
            onPress={() => buy(PRODUCT_NO_ADS)}
          />
        )}

        {noAds && allLevels && (
          <View style={styles.unlocked}>
            <AppText style={styles.unlockedEmoji}>🎉</AppText>
            <AppText variant="heading" style={styles.unlockedTitle}>{t('setting_unlocked_label')}</AppText>
            <AppText variant="caption" style={styles.featureText}>{t('paywall_trial_note')}</AppText>
          </View>
        )}

        {iapAvailable && products.length === 0 && (
          <AppText variant="caption" style={styles.notice}>{t('error_billing')}</AppText>
        )}

        <Button
          variant="outline"
          label={restoring ? t('common_loading') : t('paywall_restore')}
          onPress={restore}
          disabled={busy}
          color={colors.primary}
        />

        <AppText variant="caption" style={styles.notice}>{t('paywall_trial_note')}</AppText>

        <View style={styles.legal}>
          {!!extra.privacyUrl && (
            <Pressy onPress={() => Linking.openURL(extra.privacyUrl!)}>
              <AppText variant="caption" style={styles.link}>{t('paywall_privacy')}</AppText>
            </Pressy>
          )}
          {!!extra.termsUrl && (
            <Pressy onPress={() => Linking.openURL(extra.termsUrl!)}>
              <AppText variant="caption" style={styles.link}>{t('paywall_terms')}</AppText>
            </Pressy>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },

  hero: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
    gap: space.xs,
    ...shadow,
  },
  heroEmoji: { fontSize: 44, lineHeight: 54 },
  heroText: { textAlign: 'center', fontFamily: fonts.bold, color: colors.primaryDark },

  thanks: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 5,
    borderBottomColor: '#13A850',
  },
  thanksText: { color: '#fff', fontFamily: fonts.bold, textAlign: 'center' },

  features: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: colors.border,
    padding: space.md,
    gap: space.md,
    ...shadow,
  },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  featureEmoji: { fontSize: 30, lineHeight: 38 },
  featureTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.text },
  featureText: { color: colors.textMuted },

  plan: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: colors.border,
    padding: space.md,
    gap: space.md,
    ...shadow,
  },
  planHighlight: { borderColor: colors.yellow, borderBottomColor: '#E0A800' },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  planLabel: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  planDesc: { color: colors.textMuted },
  price: { color: colors.primaryDark },
  badge: {
    position: 'absolute',
    top: -14,
    right: 18,
    backgroundColor: colors.yellow,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.bold, color: colors.text },

  unlocked: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: 'center',
    gap: space.xs,
    ...shadow,
  },
  unlockedEmoji: { fontSize: 48, lineHeight: 58 },
  unlockedTitle: { color: colors.primaryDark },

  notice: { textAlign: 'center', color: colors.textMuted },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: space.lg, paddingTop: space.xs },
  link: { color: colors.primaryDark, fontFamily: fonts.bold, textDecorationLine: 'underline' },
});
