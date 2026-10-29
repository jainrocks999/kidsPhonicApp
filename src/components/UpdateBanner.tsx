import { StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Pressy } from './Pressy';
import { installUpdate, useAppUpdate } from '@/services/appUpdate';
import { useT } from '@/i18n';
import { colors, radius, shadow, space } from '@/theme';

export function UpdateBanner() {
  const t = useT();
  const ready = useAppUpdate((s) => s.ready);
  const insets = useSafeAreaInsets();
  if (!ready) return null;
  return (
    <Animated.View entering={SlideInDown} style={[styles.banner, { bottom: insets.bottom + space.md }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="heading" style={{ color: '#fff' }}>
          {t('update_ready_title')}
        </AppText>
        <AppText variant="caption" style={{ color: '#fff' }}>
          {t('update_ready_message')}
        </AppText>
      </View>
      <Pressy onPress={installUpdate} style={styles.btn}>
        <AppText variant="heading" style={{ color: colors.blue }}>
          {t('update_ready_action')}
        </AppText>
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    padding: space.md,
    ...shadow,
  },
  btn: { backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
});
