import { FlatList, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import licenses from '@/data/licenses.generated.json';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

const CONTENT_CREDITS = [
  { name: 'Kenney UI Audio / Music Jingles (click, lesson complete)', version: 'kenney.nl', license: 'CC0-1.0' },
  { name: 'Quicksand font', version: 'Google Fonts', license: 'OFL-1.1' },
];

export default function Licenses() {
  const t = useT();
  return (
    <Screen title={t('setting_other_open_source_license')}>
      <FlatList
        data={[...CONTENT_CREDITS, ...licenses]}
        keyExtractor={(l) => `${l.name}@${l.version}`}
        contentContainerStyle={{ padding: space.lg }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <AppText style={{ flex: 1 }}>{item.name}</AppText>
            <AppText variant="caption">
              {item.version} · {item.license}
            </AppText>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
