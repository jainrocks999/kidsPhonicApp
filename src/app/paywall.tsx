import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { getLevel, levels } from '@/data/curriculum';
import { purchase, restorePurchases } from '@/services/purchases';
import { useT, type StringKey } from '@/i18n';
import { colors, radius, shadow, space } from '@/theme';

export default function Paywall() {
  const t = useT();
  const { level: levelParam } = useLocalSearchParams<{ level?: string }>();
  const level = levelParam && levelParam !== 'ALL' ? getLevel(levelParam) : undefined;
  const [plan, setPlan] = useState<'level' | 'ALL'>(level ? 'level' : 'ALL');
  const [busy, setBusy] = useState(false);
  const levelTitle = level ? t(`home_level_${level.number}_title` as StringKey) : '';

  const features: [string, StringKey, string][] = [
    ['🔓', 'paywall_feature_all_levels', t('paywall_feature_all_levels_desc')],
    ['🚫', 'paywall_feature_no_ads', t('paywall_feature_no_ads_desc')],
    ['💬', 'paywall_feature_priority_support', t('paywall_feature_priority_support_desc')],
  ];

  const buy = async () => {
    setBusy(true);
    try {
      await purchase(plan === 'ALL' ? 'ALL' : level!.id);
      router.back();
    } catch {
      Alert.alert(t('common_error'), t('error_billing'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('paywall_title')}>
      <ScrollView contentContainerStyle={styles.root}>
        <AppText style={{ fontSize: 72, textAlign: 'center' }}>🏆</AppText>
        <AppText style={{ textAlign: 'center', color: colors.textMuted }}>
          {level ? t('paywall_subtitle', levelTitle) : t('paywall_subtitle_all')}
        </AppText>
        <View style={styles.features}>
          {features.map(([icon, key, desc]) => (
            <View key={key} style={styles.feature}>
              <AppText style={{ fontSize: 28 }}>{icon}</AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{t(key)}</AppText>
                <AppText variant="caption">{desc}</AppText>
              </View>
            </View>
          ))}
        </View>
        {level && (
          <Pressy onPress={() => setPlan('level')} style={[styles.plan, plan === 'level' && styles.planOn]}>
            <AppText variant="caption">{t('paywall_plan_level_badge')}</AppText>
            <AppText variant="heading">
              {t('paywall_plan_level_label')} · {t('paywall_level_short', level.number)}
            </AppText>
            <AppText variant="caption">{t('paywall_feature_unlimited_downloads_desc', level.units.length, levelTitle)}</AppText>
          </Pressy>
        )}
        <Pressy onPress={() => setPlan('ALL')} style={[styles.plan, plan === 'ALL' && styles.planOn]}>
          <AppText variant="caption" style={{ color: colors.primary }}>
            {t('paywall_plan_bundle_badge')}
          </AppText>
          <AppText variant="heading">{t('paywall_plan_bundle_label')}</AppText>
          <AppText variant="caption">{levels.length} × 8 units</AppText>
        </Pressy>
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          {t('paywall_trial_note')}
        </AppText>
        <Button label={t('paywall_subscribe')} onPress={buy} disabled={busy} />
        <Pressy
          onPress={() =>
            restorePurchases()
              .then(() => router.back())
              .catch(() => Alert.alert(t('common_error'), t('paywall_error_no_subscription_to_restore')))
          }
          style={{ alignSelf: 'center', padding: space.sm }}>
          <AppText variant="caption">{t('paywall_restore')}</AppText>
        </Pressy>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { padding: space.lg, gap: space.md },
  features: { gap: space.sm },
  feature: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  plan: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: 3, borderColor: 'transparent', ...shadow },
  planOn: { borderColor: colors.primary },
});
