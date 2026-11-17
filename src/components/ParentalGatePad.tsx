import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Pressy } from './Pressy';
import { promptAudio } from '@/assets';
import { play, tryAgain } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { colors, radius, shadow, space } from '@/theme';

const LEN = 4;

/**
 * The parental challenge itself: digits shown as words ("Seven, Two…") so pre-readers can't
 * pass by matching shapes. Used by the gate screen and by the ad tap gates.
 */
export function ParentalGatePad({ onSuccess, onCancel }: { onSuccess: () => void; onCancel?: () => void }) {
  const t = useT();
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
      onSuccess();
    } else {
      tryAgain();
      setInput([]);
    }
  };

  return (
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
      {onCancel && (
        <Pressy onPress={onCancel} accessibilityRole="button" style={styles.cancel}>
          <AppText style={styles.cancelText}>{t('common_cancel')}</AppText>
        </Pressy>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: space.lg, gap: space.lg, justifyContent: 'center' },
  slots: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
  slot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md, maxWidth: 320, alignSelf: 'center' },
  key: { width: 84, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  keyOn: { backgroundColor: colors.surface, ...shadow },
  cancel: { alignSelf: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm },
  cancelText: { color: colors.textMuted, textAlign: 'center' },
});
