import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Pressy } from './Pressy';
import { WavyRainbow } from './RainbowText';
import { colors, fonts, radius, shadow, space, unitColors, unitDark } from '@/theme';
import type { Unit } from '@/data/types';

/**
 * Station sign above the train: the next unit's letters, big and bouncy,
 * its lessons as tappable tiles, and one big Start button.
 * With no `unit` (level finished) it shows a trophy and a replay button.
 */
export function NextStopBoard({
  unit,
  colorIndex,
  done,
  startLabel,
  replayLabel,
  onStart,
  onLesson,
  palette,
}: {
  unit?: Unit;
  /** Letter colours (the level's ink). */
  palette?: readonly string[];
  colorIndex: number;
  /** lessonId → finished */
  done: Record<string, unknown>;
  startLabel: string;
  replayLabel: string;
  onStart: () => void;
  onLesson: (lessonId: string) => void;
}) {
  const color = unit ? unitColors[colorIndex % unitColors.length] : colors.yellow;
  const edge = unit ? unitDark[colorIndex % unitDark.length] : '#E0A800';
  const title = unit?.title ?? '';
  const size = title.length <= 9 ? 58 : title.length <= 14 ? 46 : 36;

  return (
    <View style={styles.wrap}>
      {/* posts */}
      <View style={[styles.post, { left: '14%' }]} />
      <View style={[styles.post, { right: '14%' }]} />

      <View style={[styles.board, { borderColor: color, borderBottomColor: edge }]}>
        <View style={[styles.dot, { backgroundColor: color, top: 10, left: 10 }]} />
        <View style={[styles.dot, { backgroundColor: color, top: 10, right: 10 }]} />

        <View style={[styles.tag, { backgroundColor: color, borderBottomColor: edge }]}>
          <AppText style={styles.tagText}>🚉 {unit ? unit.number : '🏁'}</AppText>
        </View>

        {unit ? (
          <>
            <WavyRainbow text={title} size={size} palette={palette} />

            <View style={styles.tiles}>
              {unit.lessons.map((lesson, i) => {
                const c = unitColors[(colorIndex + i + 1) % unitColors.length];
                const e = unitDark[(colorIndex + i + 1) % unitDark.length];
                // "ame ake" → two lines so each chunk stays big
                const text = lesson.displayLetter.replace(/ /g, '\n');
                const twoLines = text.includes('\n');
                const longest = Math.max(...text.split('\n').map((l) => l.length));
                const fontSize = (twoLines ? 28 : 50) * (longest <= 2 ? 1 : longest === 3 ? 0.82 : 0.68);
                return (
                  <Pressy
                    key={lesson.id}
                    onPress={() => onLesson(lesson.id)}
                    accessibilityLabel={lesson.displayLetter}
                    style={[styles.tile, { backgroundColor: c, borderBottomColor: e }]}>
                    <View style={styles.tileShine} />
                    <AppText
                      numberOfLines={twoLines ? 2 : 1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                      style={[styles.tileText, { fontSize, lineHeight: fontSize * 1.15 }]}>
                      {text}
                    </AppText>
                    {!!done[lesson.id] && (
                      <View style={styles.check}>
                        <AppText style={styles.checkText}>✓</AppText>
                      </View>
                    )}
                  </Pressy>
                );
              })}
            </View>
          </>
        ) : (
          <AppText style={styles.trophy}>🏆</AppText>
        )}

        <Pressy
          onPress={onStart}
          accessibilityRole="button"
          style={[styles.start, { backgroundColor: unit ? colors.green : colors.primary, borderBottomColor: unit ? '#13A850' : colors.primaryDark }]}>
          <AppText style={styles.startText}>{unit ? `▶  ${startLabel}` : `🔁  ${replayLabel}`}</AppText>
        </Pressy>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: space.md, paddingBottom: 18 },
  post: { position: 'absolute', bottom: 0, top: 40, width: 14, borderRadius: 7, backgroundColor: '#A0724E' },
  board: {
    alignItems: 'center',
    gap: space.sm + 4,
    backgroundColor: '#FFFDF5',
    borderRadius: radius.lg,
    borderWidth: 5,
    borderBottomWidth: 10,
    paddingTop: space.lg + 4,
    paddingBottom: space.md,
    paddingHorizontal: space.md,
    ...shadow,
  },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  tag: {
    position: 'absolute',
    top: -20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#fff',
    borderBottomWidth: 5,
  },
  tagText: { color: '#fff', fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  tiles: { flexDirection: 'row', alignSelf: 'stretch', gap: space.sm + 2, paddingTop: 4 },
  tile: {
    flex: 1,
    height: 104,
    paddingHorizontal: 6,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 9,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  tileShine: { position: 'absolute', top: 8, left: 10, width: 22, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-25deg' }] },
  tileText: {
    color: '#fff',
    fontFamily: fonts.bold,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  check: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  trophy: { fontSize: 72, lineHeight: 88 },
  start: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 999,
    borderBottomWidth: 6,
    paddingVertical: 12,
  },
  startText: { color: '#fff', fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
});
