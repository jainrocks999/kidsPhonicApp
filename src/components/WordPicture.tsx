import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from './AppText';
import { wordImage } from '@/assets';
import type { Word } from '@/data/types';

/** Illustrated vocab image when bundled, otherwise the curriculum emoji. */
export function WordPicture({ word, size = 120, style }: { word: Word; size?: number; style?: ViewStyle }) {
  const img = wordImage(word);
  return (
    <View style={[styles.box, { width: size, height: size }, style]}>
      {img ? (
        <Image source={img} style={{ width: size, height: size }} contentFit="contain" />
      ) : (
        <AppText style={{ fontSize: size * 0.68, lineHeight: size * 0.9 }}>{word.emoji}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center' } });
