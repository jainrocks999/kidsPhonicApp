import { Alert, Linking, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { openStoreListing } from '@/services/review';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT } from '@/i18n';
import { colors, fonts, radius, shadow, space } from '@/theme';

const extra = (Constants.expoConfig?.extra ?? {}) as { privacyUrl?: string; termsUrl?: string; supportEmail?: string };

/** Section heading as a white pill, so it stays readable over the scenery. */
function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.sectionLabel}>
      <AppText variant="caption" style={styles.sectionLabelText}>{children}</AppText>
    </View>
  );
}

function Row({
  icon,
  tint,
  label,
  value,
  onPress,
  right,
  danger,
}: {
  icon: string;
  tint: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressy disabled={!onPress} onPress={onPress} style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: tint }]}>
        <AppText style={styles.iconGlyph}>{icon}</AppText>
      </View>
      <AppText style={[styles.rowLabel, danger && { color: colors.red }]}>{label}</AppText>
      {value ? (
        <View style={styles.valuePill}>
          <AppText variant="caption" style={styles.valueText}>{value}</AppText>
        </View>
      ) : null}
      {right}
      {onPress && !right ? <AppText style={styles.chevron}>›</AppText> : null}
    </Pressy>
  );
}

export default function Settings() {
  const t = useT();
  const s = useSettings();
  const reset = useProgress((p) => p.reset);
  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen title={t('setting_title')}>
      <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
        <SectionLabel>{t('setting_general')}</SectionLabel>
        <View style={styles.group}>
          {/* English-only for now — uncomment to bring the language switch back
              (and ENGLISH_ONLY in src/store/settings.ts).
          <Row
            icon="🌏"
            tint={colors.blue}
            label={t('setting_language')}
            value={s.language === 'en' ? t('language_english') : t('language_vietnamese')}
            onPress={() => s.setLanguage(s.language === 'en' ? 'vi' : 'en')}
          />
          */}
          <Row
            icon="🔊"
            tint={colors.blue}
            label={t('setting_sound_effects')}
            right={
              <Switch
                value={s.soundEffects}
                onValueChange={s.setSoundEffects}
                trackColor={{ false: colors.locked, true: colors.green }}
                thumbColor="#fff"
                ios_backgroundColor={colors.locked}
              />
            }
          />
        </View>

        <SectionLabel>{t('setting_support_title')}</SectionLabel>
        <View style={styles.group}>
          <Row icon="⭐" tint={colors.yellow} label={t('setting_support_rate')} onPress={openStoreListing} />
          {!!extra.supportEmail && (
            <Row
              icon="✉️"
              tint={colors.purple}
              label={t('setting_support_feedback')}
              onPress={() => Linking.openURL(`mailto:${extra.supportEmail}?subject=${encodeURIComponent(`Phonics Flashcards for Kids ${version} feedback`)}`)}
            />
          )}
          <Row icon="📤" tint={colors.green} label={t('setting_support_share')} onPress={() => Share.share({ message: t('setting_share_message') })} />
          <Row
            icon="🗑️"
            tint={colors.red}
            danger
            label={t('setting_reset_progress')}
            onPress={() =>
              Alert.alert(t('setting_reset_confirm_title'), t('setting_reset_confirm_message'), [
                { text: t('common_cancel'), style: 'cancel' },
                { text: t('common_delete'), style: 'destructive', onPress: reset },
              ])
            }
          />
        </View>

        <SectionLabel>{t('setting_other')}</SectionLabel>
        <View style={styles.group}>
          {!!extra.privacyUrl && <Row icon="🔒" tint={colors.orange} label={t('setting_other_privacy_policy')} onPress={() => Linking.openURL(extra.privacyUrl!)} />}
          {!!extra.termsUrl && <Row icon="📄" tint={colors.pink} label={t('setting_other_team_of_service')} onPress={() => Linking.openURL(extra.termsUrl!)} />}
          <Row icon="📜" tint={colors.purple} label={t('setting_other_open_source_license')} onPress={() => router.push('/licenses')} />
          <Row icon="ℹ️" tint={colors.primary} label={t('setting_information_app_version')} value={version} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { padding: space.lg, gap: space.sm, paddingBottom: space.xl * 2 },

  sectionLabel: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  sectionLabelText: { fontFamily: fonts.bold, color: colors.primaryDark, fontSize: 14 },

  // Same chunky 3D card as the home/level screens: white rim + thick bottom edge.
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: colors.border,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    marginBottom: space.md,
    ...shadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4, minHeight: 60, paddingHorizontal: space.sm, paddingVertical: space.sm },
  iconTile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.16)' },
  iconGlyph: { fontSize: 19, lineHeight: 26 },
  rowLabel: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  valuePill: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 3 },
  valueText: { color: colors.primaryDark, fontFamily: fonts.bold },
  chevron: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 28, color: colors.locked },
});
