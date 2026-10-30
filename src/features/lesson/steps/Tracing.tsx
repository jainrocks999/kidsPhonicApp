import { useEffect, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { Pressy } from '@/components/Pressy';
import { patternSound } from '@/assets';
import { click, play, praise } from '@/services/audio';
import { useT } from '@/i18n';
import { colors, fonts, levelColors, radius, shadow, space } from '@/theme';
import { StepGuide } from '../fx';
import { FRESH, GUIDE, advance, frameFor, lift, strokesFor, type Ink, type Pt, type Stroke } from '../strokes';
import type { StepProps } from '../types';

type CaseMode = 'upper' | 'lower';

/** Width of the letter's "road", in letter units. */
const ROAD = 14;
/** The child's own line — thin enough that the letter and arrows stay readable underneath. */
const INK = 4;
/** One direction arrow every this many samples (~16 units) along the current stroke. */
const ARROW_EVERY = 11;

const pts = (s: Pt[]) => s.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export function Tracing({ lessonRef, onDone }: StepProps) {
  const t = useT();
  const { lesson, level } = lessonRef;
  const { width } = useWindowDimensions();
  const size = Math.min(width - space.lg * 2 - 8, 340); // 8 = the card's side borders
  const accent = levelColors[level.number - 1];
  const [caseMode, setCaseMode] = useState<CaseMode>('upper');
  const [scores, setScores] = useState<Partial<Record<CaseMode, number>>>({});
  const [ink, setInk] = useState<Ink>(FRESH);
  const [demo, setDemo] = useState(0);
  const letter = caseMode === 'upper' ? lesson.letter.toUpperCase() : lesson.letter.toLowerCase();
  const strokes = useMemo(() => strokesFor(letter) ?? [], [letter]);
  const view = useMemo(() => frameFor(strokes), [strokes]);
  const done = strokes.length > 0 && ink.stroke >= strokes.length;
  const current = strokes[ink.stroke];
  const drawing = ink.trail.length > 0;
  const accuracy = ink.on / Math.max(1, ink.on + ink.off);
  const stars = accuracy >= 0.85 ? 3 : accuracy >= 0.65 ? 2 : 1;
  const result = done
    ? { stars, text: t(stars === 3 ? 'tracing_score_excellent' : stars === 2 ? 'tracing_score_very_good' : 'tracing_score_good') }
    : null;

  const reset = (mode = caseMode) => {
    setCaseMode(mode);
    setInk(FRESH);
  };

  // a ball shows the way along the stroke while the child isn't drawing
  const showDemo = !!current && current.length > 1 && !drawing && ink.prog === 0;
  useEffect(() => {
    if (!showDemo) return;
    let frame = 0;
    const travel = Math.round(current.length * 0.7); // ~25 ms per sample
    const id = setInterval(() => {
      frame = (frame + 1) % (travel + 25); // then a short rest
      setDemo(frame / travel);
    }, 25);
    return () => clearInterval(id);
  }, [showDemo, current]);

  // stroke finished → tick; letter finished → stars, praise, then the other case / next step
  useEffect(() => {
    if (ink.stroke === 0) return;
    if (!done) {
      click();
      return;
    }
    let alive = true;
    praise().then(() => {
      if (!alive) return;
      const nextScores = { ...scores, [caseMode]: Math.max(0.4, accuracy) };
      setScores(nextScores);
      if (nextScores.upper != null && nextScores.lower != null) onDone((nextScores.upper + nextScores.lower) / 2);
      else reset(caseMode === 'upper' ? 'lower' : 'upper');
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink.stroke]);

  const toUnits = (e: GestureResponderEvent): Pt => ({
    x: view.x + (e.nativeEvent.locationX * view.size) / size,
    y: view.y + (e.nativeEvent.locationY * view.size) / size,
  });
  // Rebuilt every render on purpose: the responder reads its handlers from the latest props.
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => !done,
    onMoveShouldSetPanResponder: () => !done,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const p = toUnits(e);
      setInk((k) => advance(k, p, strokes));
    },
    onPanResponderMove: (e) => {
      const p = toUnits(e);
      setInk((k) => advance(k, p, strokes));
    },
    onPanResponderRelease: () => setInk(lift),
    onPanResponderTerminate: () => setInk(lift),
  });

  /** Arrowheads along a stroke, pointing the way to go. */
  const arrows = (s: Stroke) => {
    const out = [];
    for (let m = Math.min(ARROW_EVERY, Math.floor(s.length / 2)); m < s.length - 4; m += ARROW_EVERY) {
      const a = s[m - 2];
      const b = s[Math.min(s.length - 1, m + 2)];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const at = (r: number, d: number) => ({ x: s[m].x + Math.cos(ang + d) * r, y: s[m].y + Math.sin(ang + d) * r });
      out.push(
        <Polygon
          key={m}
          points={pts([at(3.6, 0), at(3.6, 2.4), at(1.2, Math.PI), at(3.6, -2.4)])}
          fill={accent}
          stroke="#fff"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />,
      );
    }
    return out;
  };

  const ball = current && showDemo && demo <= 1 ? current[Math.min(current.length - 1, Math.floor(demo * (current.length - 1)))] : null;
  const end = current?.[current.length - 1];
  const finger = ink.trail[ink.trail.length - 1];
  const paper = { x1: view.x, x2: view.x + view.size };

  return (
    <View style={styles.root}>
      <StepGuide emoji="✏️" text={t('step_guide_tracing')} />

      <View style={styles.tabs}>
        {(['upper', 'lower'] as const).map((m) => (
          <Pressy key={m} onPress={() => reset(m)} style={[styles.tab, caseMode === m && { backgroundColor: accent, borderBottomColor: 'rgba(0,0,0,0.18)' }]}>
            <AppText style={[styles.tabText, caseMode === m && { color: '#fff' }]}>
              {scores[m] != null ? '✅ ' : ''}
              {t(m === 'upper' ? 'tracing_case_upper' : 'tracing_case_lower')}
            </AppText>
          </Pressy>
        ))}
      </View>

      <View style={styles.card}>
        <View style={{ width: size, height: size }} {...pan.panHandlers}>
          <Svg width={size} height={size} viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`} pointerEvents="none">
            {/* handwriting paper */}
            <Line {...paper} y1={GUIDE.top} y2={GUIDE.top} stroke="#C9DDF4" strokeWidth={0.6} />
            <Line {...paper} y1={GUIDE.mid} y2={GUIDE.mid} stroke="#C9DDF4" strokeWidth={0.6} strokeDasharray="2.5 2" />
            <Line {...paper} y1={GUIDE.base} y2={GUIDE.base} stroke="#F4A9B8" strokeWidth={0.9} />
            <Line {...paper} y1={GUIDE.desc} y2={GUIDE.desc} stroke="#C9DDF4" strokeWidth={0.6} />

            {/* the letter: a soft road with a dotted centre — green once a stroke is done */}
            {strokes.map((s, i) => {
              const road = i < ink.stroke ? '#C3EDD3' : '#E4E8F7';
              return s.length === 1 ? (
                <Circle key={`r${i}`} cx={s[0].x} cy={s[0].y} r={ROAD / 2} fill={road} />
              ) : (
                <G key={`r${i}`}>
                  <Polyline points={pts(s)} stroke={road} strokeWidth={ROAD} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {i >= ink.stroke && (
                    <Polyline points={pts(s)} stroke="#A3AACB" strokeWidth={1.2} strokeDasharray="0.1 2.8" strokeLinecap="round" fill="none" />
                  )}
                </G>
              );
            })}

            {/* the child's own lines, exactly where the finger went */}
            {[...ink.lines, ink.trail].map((l, i) =>
              l.length > 1 ? (
                <Polyline key={`l${i}`} points={pts(l)} stroke={accent} strokeWidth={INK} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ) : null,
            )}

            {/* on top of everything, so a line never hides it: the way to go for this stroke */}
            {current && current.length > 1 && <G opacity={drawing ? 0.55 : 1}>{arrows(current)}</G>}
            {end && current.length > 1 && <Circle cx={end.x} cy={end.y} r={2.6} fill="#fff" stroke={accent} strokeWidth={1.2} />}
            {current && (
              <G>
                <Circle cx={current[0].x} cy={current[0].y} r={5.2} fill={colors.green} stroke="#fff" strokeWidth={1.4} />
                <SvgText x={current[0].x} y={current[0].y + 2.3} fontSize={6.2} fontFamily={fonts.bold} fill="#fff" textAnchor="middle">
                  {ink.stroke + 1}
                </SvgText>
              </G>
            )}
            {ball && <Circle cx={ball.x} cy={ball.y} r={3.6} fill="#fff" stroke={accent} strokeWidth={2} />}
            {finger && !ink.lastOn && <Circle cx={finger.x} cy={finger.y} r={INK} fill="none" stroke={colors.red} strokeWidth={1.2} />}
          </Svg>
        </View>

        {result && (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.result} pointerEvents="none">
            <AppText style={styles.resultStars}>{'⭐'.repeat(result.stars)}</AppText>
            <AppText style={styles.resultText}>{result.text}</AppText>
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressy onPress={() => play(patternSound(lesson.letter), lesson.letter)} style={styles.action} accessibilityLabel={t('vocabulary_listen_cd')}>
          <AppText style={styles.actionEmoji}>🔊</AppText>
          <AppText style={styles.actionText}>{t('vocabulary_listen_cd')}</AppText>
        </Pressy>
        <Pressy
          onPress={() => reset()}
          disabled={!ink.stroke && !ink.prog && !ink.lines.length}
          style={[styles.action, !ink.stroke && !ink.prog && !ink.lines.length && styles.actionOff]}
          accessibilityLabel={t('tracing_clear')}>
          <AppText style={styles.actionEmoji}>🧽</AppText>
          <AppText style={styles.actionText}>{t('tracing_clear')}</AppText>
        </Pressy>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: {
    paddingHorizontal: space.lg,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderBottomWidth: 4,
    borderBottomColor: colors.border,
  },
  tabText: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.text },
  // the border lives on this outer card so the touch area inside lines up exactly with the Svg
  card: {
    backgroundColor: '#FFFDF6',
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 10,
    borderBottomColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  result: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: space.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
  },
  resultStars: { fontSize: 34, lineHeight: 42 },
  resultText: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.green },
  actions: { flexDirection: 'row', gap: space.md },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderBottomWidth: 5,
    borderBottomColor: colors.border,
    ...shadow,
  },
  actionOff: { opacity: 0.5 },
  actionEmoji: { fontSize: 24, lineHeight: 30 },
  actionText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.text },
});
