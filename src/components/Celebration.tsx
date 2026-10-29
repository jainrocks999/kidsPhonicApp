import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, radius, space } from '@/theme';
import { playSfx } from '@/services/audio';
import { sfx } from '@/assets';

export function Celebration({
  visible,
  title,
  subtitle,
  stars,
  primary,
  secondary,
  emoji = '🎉',
  silent,
}: {
  emoji?: string;
  silent?: boolean;
  visible: boolean;
  title: string;
  subtitle?: string;
  stars?: number;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  useEffect(() => {
    if (visible && !silent) playSfx(sfx.complete);
  }, [visible, silent]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View entering={ZoomIn.springify()} style={styles.card}>
          <AppText style={{ fontSize: 72 }}>{emoji}</AppText>
          {stars != null && (
            <AppText style={{ fontSize: 40, letterSpacing: 4 }}>
              {'⭐'.repeat(stars)}
              {'☆'.repeat(3 - stars)}
            </AppText>
          )}
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText style={{ textAlign: 'center', color: colors.textMuted }}>{subtitle}</AppText>
          ) : null}
          <Button label={primary.label} onPress={primary.onPress} style={{ alignSelf: 'stretch', marginTop: space.md }} />
          {secondary && (
            <Button label={secondary.label} onPress={secondary.onPress} variant="outline" style={{ alignSelf: 'stretch' }} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: 'center',
    gap: space.sm,
  },
});
