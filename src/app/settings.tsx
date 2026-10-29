import { Alert, Linking, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { levels } from '@/data/curriculum';
import { deletePack, downloadPack, formatMB, packInfo, packsForLevel, isBundled, useContent } from '@/services/content';
import { openStoreListing } from '@/services/review';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, radius, shadow, space } from '@/theme';

const extra = (Constants.expoConfig?.extra ?? {}) as { privacyUrl?: string; termsUrl?: string; supportEmail?: string };

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
  const installed = useContent((c) => c.installed);
  const progress = useContent((c) => c.progress);
  const version = Constants.expoConfig?.version ?? '';

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

        <AppText variant="caption">{t('setting_storage_title')}</AppText>
        <View style={styles.group}>
          {levels.map((l) => {
            const packs = packsForLevel(l.number).filter((p) => !isBundled(p));
            const have = packs.filter((p) => installed[p]);
            const busy = packs.some((p) => progress[p] != null);
            const bytes = packs.reduce((n, p) => n + (packInfo(p)?.bytes ?? 0), 0);
            const name = t('level_name', l.number, t(`home_level_${l.number}_title` as StringKey));
            const value = busy
              ? `${t('common_loading')} ${have.length}/${packs.length}`
              : have.length === packs.length
                ? t('setting_storage_downloaded', formatMB(bytes))
                : `${t('setting_storage_not_downloaded')} · ${formatMB(bytes)}`;
            return (
              <Row
                key={l.id}
                label={name}
                value={value}
                onPress={
                  busy
                    ? undefined
                    : have.length === packs.length
                      ? () =>
                          Alert.alert(name, t('setting_storage_delete_confirm'), [
                            { text: t('common_cancel'), style: 'cancel' },
                            { text: t('setting_storage_delete'), style: 'destructive', onPress: () => packs.forEach(deletePack) },
                          ])
                      : () =>
                          packs
                            .filter((p) => !installed[p])
                            .reduce((chain, p) => chain.then(() => downloadPack(p)), Promise.resolve())
                            .catch(() => Alert.alert(t('error_network'), t('error_network_description')))
                }
              />
            );
          })}
        </View>

        <AppText variant="caption">{t('setting_support_title')}</AppText>
        <View style={styles.group}>
          <Row label={`⭐ ${t('setting_support_rate')}`} onPress={openStoreListing} />
          {!!extra.supportEmail && (
            <Row
              label={`✉️ ${t('setting_support_feedback')}`}
              onPress={() => Linking.openURL(`mailto:${extra.supportEmail}?subject=${encodeURIComponent(`ABC Phonics Kids ${version} feedback`)}`)}
            />
          )}
          <Row label={`📤 ${t('setting_support_share')}`} onPress={() => Share.share({ message: t('setting_share_message') })} />
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

        <AppText variant="caption">{t('setting_other')}</AppText>
        <View style={styles.group}>
          {!!extra.privacyUrl && <Row label={t('setting_other_privacy_policy')} onPress={() => Linking.openURL(extra.privacyUrl!)} />}
          {!!extra.termsUrl && <Row label={t('setting_other_team_of_service')} onPress={() => Linking.openURL(extra.termsUrl!)} />}
          <Row label={t('setting_other_open_source_license')} onPress={() => router.push('/licenses')} />
          <Row label={t('setting_information_app_version')} value={version} />
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
