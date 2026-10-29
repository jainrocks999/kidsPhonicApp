import { Alert, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { ProgressBar } from './ProgressBar';
import { Pressy } from './Pressy';
import { downloadPack, formatMB, isBundled, packInfo, useContent } from '@/services/content';
import { useT } from '@/i18n';
import { colors, radius, space } from '@/theme';

/**
 * Download strip for a unit whose media isn't bundled. Lessons still work without it
 * (on-device voice + emoji), the pack adds the recorded narration, songs and pictures.
 */
export function PackDownload({ pack, accent }: { pack: string; accent: string }) {
  const t = useT();
  const installed = useContent((s) => !!s.installed[pack]);
  const progress = useContent((s) => s.progress[pack]);
  const info = packInfo(pack);
  if (isBundled(pack) || installed || !info) return null;

  const start = () =>
    downloadPack(pack).catch(() => Alert.alert(t('error_network'), t('error_network_description')));

  if (progress != null) {
    return (
      <View style={styles.box}>
        <AppText variant="caption">
          ⬇️ {t('common_loading')} {Math.round(progress * 100)}%
        </AppText>
        <ProgressBar value={progress} color={accent} height={8} />
      </View>
    );
  }
  return (
    <Pressy onPress={start} style={[styles.box, styles.row]}>
      <AppText variant="caption" style={{ flex: 1 }}>
        ⬇️ {t('setting_storage_not_downloaded')} · {formatMB(info.bytes)}
      </AppText>
      <View style={[styles.btn, { backgroundColor: accent }]}>
        <AppText variant="caption" style={{ color: '#fff' }}>
          {t('pack_download')}
        </AppText>
      </View>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.bg, borderRadius: radius.md, padding: space.sm, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  btn: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
});
