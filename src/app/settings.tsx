import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { levels } from '@/data/curriculum';
import { useProgress } from '@/store/progress';
import { isLevelOwned, useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, radius, shadow, space } from '@/theme';

function Row({ label, value, onPress, right }: { label: string; value?: string; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Pressy disabled={!onPress} onPress={onPress} style={styles.row}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {value ? <AppText variant="caption">{value}</AppText> : null}
      {right}
    </Pressy>
  );
}

export default function Settings() {
  const t = useT();
  const s = useSettings();
  const reset = useProgress((p) => p.reset);
  const [versionTaps, setVersionTaps] = useState(0);

  return (
    <Screen title={t('setting_title')}>
      <ScrollView contentContainerStyle={styles.root}>
        <AppText variant="caption">{t('setting_general')}</AppText>
        <View style={styles.group}>
          <Row
            label={t('setting_language')}
            value={s.language === 'en' ? t('language_english') : t('language_vietnamese')}
            onPress={() => s.setLanguage(s.language === 'en' ? 'vi' : 'en')}
          />
          <Row label={t('setting_sound_effects')} right={<Switch value={s.soundEffects} onValueChange={s.setSoundEffects} />} />
        </View>

        <AppText variant="caption">{t('setting_parent_control_title')}</AppText>
        <View style={styles.group}>
          {levels.map((l) => {
            const owned = isLevelOwned(l.id, l.isPremium, s.purchases, s.devMode);
            return (
              <Row
                key={l.id}
                label={t('level_name', l.number, t(`home_level_${l.number}_title` as StringKey))}
                value={!l.isPremium ? t('unit_free_label') : owned ? t('setting_unlocked_label') : t('setting_parent_control_buy_plain')}
                onPress={owned ? undefined : () => router.push(`/paywall?level=${l.id}`)}
              />
            );
          })}
        </View>

        <AppText variant="caption">{t('setting_support_title')}</AppText>
        <View style={styles.group}>
          <Row label={t('setting_support_share')} onPress={() => Share.share({ message: t('setting_share_message') })} />
          <Row
            label={t('setting_reset_progress')}
            onPress={() =>
              Alert.alert(t('setting_reset_confirm_title'), t('setting_reset_confirm_message'), [
                { text: t('common_cancel'), style: 'cancel' },
                { text: t('common_delete'), style: 'destructive', onPress: reset },
              ])
            }
          />
        </View>

        <AppText variant="caption">{t('setting_information')}</AppText>
        <View style={styles.group}>
          <Row
            label={t('setting_information_app_version')}
            value={Constants.expoConfig?.version ?? ''}
            onPress={() => {
              // 7 taps toggles developer mode (unlocks all levels/units for QA).
              const n = versionTaps + 1;
              setVersionTaps(n);
              if (n >= 7) {
                s.setDevMode(!s.devMode);
                setVersionTaps(0);
                Alert.alert(t('setting_other_developer_mode'), s.devMode ? 'OFF' : 'ON');
              }
            }}
          />
          {s.devMode && <Row label={`🛠 ${t('setting_other_developer_mode')}`} right={<Switch value onValueChange={() => s.setDevMode(false)} />} />}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { padding: space.lg, gap: space.sm },
  group: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', marginBottom: space.md, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
