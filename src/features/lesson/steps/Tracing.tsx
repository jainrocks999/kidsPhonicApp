import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Pressy } from '@/components/Pressy';
import { patternSound } from '@/assets';
import { play, praise, tryAgain } from '@/services/audio';
import { useT } from '@/i18n';
import { colors, fonts, levelColors, radius, shadow, space } from '@/theme';
import type { StepProps } from '../types';

type Pt = { x: number; y: number };

/**
 * Free-hand tracing over a dashed letter. Score = how much of the letter's box the child
 * covered on a coarse grid plus stroke length — forgiving on purpose for ages 3–5.
 */
export function Tracing({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, level } = lessonRef;
  const { width } = useWindowDimensions();
  const size = Math.min(width - space.lg * 2, 360);
  const accent = levelColors[level.number - 1];
  const [caseMode, setCaseMode] = useState<'upper' | 'lower'>('upper');
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [passed, setPassed] = useState({ upper: false, lower: false });
  const letter = caseMode === 'upper' ? lesson.letter.toUpperCase() : lesson.letter.toLowerCase();

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          setStrokes((s) => [...s, [{ x, y }]]);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          setStrokes((s) => {
            const copy = s.slice();
            copy[copy.length - 1] = [...copy[copy.length - 1], { x, y }];
            return copy;
          });
        },
      }),
    [],
  );

  const check = async () => {
    const GRID = 6;
    const cells = new Set<string>();
    let length = 0;
    for (const st of strokes) {
      st.forEach((p, i) => {
        cells.add(`${Math.floor((p.x / size) * GRID)}:${Math.floor((p.y / size) * GRID)}`);
        if (i) length += Math.hypot(p.x - st[i - 1].x, p.y - st[i - 1].y);
      });
    }
    const score = Math.min(1, cells.size / 12) * 0.6 + Math.min(1, length / (size * 1.6)) * 0.4;
    if (score < 0.45) {
      setResult(t('tracing_fail_subtitle'));
      setStrokes([]);
      await tryAgain();
      return;
    }
    setResult(score > 0.85 ? t('tracing_score_excellent') : score > 0.65 ? t('tracing_score_very_good') : t('tracing_score_good'));
    const nowPassed = { ...passed, [caseMode]: true };
    setPassed(nowPassed);
    await praise();
    setStrokes([]);
    setResult(null);
    if (nowPassed.upper && nowPassed.lower) onDone(1);
    else setCaseMode(caseMode === 'upper' ? 'lower' : 'upper');
  };

  const d = (st: Pt[]) => st.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {(['upper', 'lower'] as const).map((m) => (
          <Pressy key={m} onPress={() => (setCaseMode(m), setStrokes([]))} style={[styles.tab, caseMode === m && { backgroundColor: accent }]}>
            <AppText variant="heading" style={{ color: caseMode === m ? '#fff' : colors.text }}>
              {passed[m] ? '✅ ' : ''}
              {t(m === 'upper' ? 'tracing_case_upper' : 'tracing_case_lower')}
            </AppText>
          </Pressy>
        ))}
      </View>
      <View style={[styles.canvas, { width: size, height: size }]} {...pan.panHandlers}>
        <Svg width={size} height={size} pointerEvents="none">
          <SvgText
            x={size / 2}
            y={size * 0.8}
            fontSize={size * 0.85}
            fontFamily={fonts.bold}
            textAnchor="middle"
            fill="#FFF3D6"
            stroke={colors.locked}
            strokeWidth={3}
            strokeDasharray="10 8">
            {letter}
          </SvgText>
          {strokes.map((st, i) => (
            <Path key={i} d={d(st)} stroke={accent} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      </View>
      <AppText variant="heading" style={{ textAlign: 'center', minHeight: 28 }}>
        {result ?? `✏️ ${t('step_guide_tracing')}`}
      </AppText>
      <View style={styles.actions}>
        <Button label="🔊" variant="outline" color={accent} onPress={() => play(patternSound(lesson.letter), lesson.letter)} />
        <Button label="🧽" variant="outline" color={accent} onPress={() => setStrokes([])} />
        <Button label={t('common_finish')} onPress={check} disabled={!strokes.length} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.md, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: colors.surface },
  canvas: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  actions: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' },
});
