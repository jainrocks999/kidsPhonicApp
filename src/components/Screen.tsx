import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { colors, space } from '@/theme';
import { stopVoice } from '@/services/audio';

export function Screen({
  title,
  back = true,
  right,
  children,
  bg = colors.bg,
  style,
}: {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  bg?: string;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'left', 'right', 'bottom']}>
      {(title || back || right) && (
        <View style={styles.header}>
          <View style={styles.side}>
            {back && (
              <IconButton
                icon="⬅️"
                accessibilityLabel="Back"
                onPress={() => {
                  stopVoice();
                  if (router.canGoBack()) router.back();
                  else router.replace('/home');
                }}
              />
            )}
          </View>
          <AppText variant="heading" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
          <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
        </View>
      )}
      <View style={[styles.body, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm },
  side: { width: 56 },
  title: { flex: 1, textAlign: 'center' },
  body: { flex: 1 },
});
