import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { click } from '@/services/audio';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with a springy squish, click sfx and a light haptic — the app's base tap target. */
export function Pressy({
  style,
  onPress,
  silent,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; silent?: boolean }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, anim]}
      onPressIn={() => scale.set(withSpring(0.93, { damping: 15 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 10 }))}
      onPress={(e) => {
        if (!silent) click();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
    />
  );
}
