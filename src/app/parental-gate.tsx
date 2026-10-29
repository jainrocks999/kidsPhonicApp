import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { promptAudio } from '@/assets';
import { play, tryAgain } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, radius, shadow, space } from '@/theme';

const LEN = 4;

/** Digits shown as words ("Seven, Two…") so pre-readers can't pass by matching shapes. */
export default function ParentalGate() {
  const t = useT();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const language = useSettings((s) => s.language);
  const [code] = useState(() => Array.from({ length: LEN }, () => Math.floor(Math.random() * 10)));
  const [input, setInput] = useState<number[]>([]);

  useEffect(() => {
    play(promptAudio('parent_gate', language));
  }, [language]);

  const press = (d: number) => {
    const v = [...input, d];
    if (v.length < LEN) return setInput(v);
    if (v.join('') === code.join('')) {
      router.replace((next ?? '/home') as Href);
    } else {
      tryAgain();
      setInput([]);
    }
  };

  return (
    <Screen title={t('parental_gate_title')}>
      <View style={styles.root}>
        <AppText style={{ textAlign: 'center' }}>{t('parental_gate_subtitle')}</AppText>
        <AppText variant="title" style={{ textAlign: 'center' }}>
          {code.map((d) => t(`digit_word_${d}` as StringKey)).join(', ')}
        </AppText>
        <View style={styles.slots}>
          {Array.from({ length: LEN }, (_, i) => (
            <View key={i} style={[styles.slot, i < input.length && { backgroundColor: colors.primary }]} />
          ))}
        </View>
        <View style={styles.pad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, -1, 0, -2].map((d) =>
            d === -1 ? (
              <View key="sp" style={styles.key} />
            ) : (
              <Pressy
                key={d}
                onPress={() => (d === -2 ? setInput(input.slice(0, -1)) : press(d))}
                style={[styles.key, styles.keyOn]}
                accessibilityLabel={d === -2 ? t('parental_gate_backspace') : String(d)}>
                <AppText variant="title">{d === -2 ? '⌫' : d}</AppText>
              </Pressy>
            ),
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  slots: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
  slot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md, maxWidth: 320, alignSelf: 'center' },
  key: { width: 84, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  keyOn: { backgroundColor: colors.surface, ...shadow },
});
