import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Pressy } from './Pressy';
import { RainbowText } from './RainbowText';
import { colors, fonts, shadow } from '@/theme';

export interface TrainCar {
  key: string;
  number: number;
  title: string;
  color: string;
  edge: string;
  /** One entry per lesson — true once it's finished (a passenger boards). */
  seats: boolean[];
  onPress: () => void;
  accessibilityLabel?: string;
}

const ENGINE_W = 156;
const GAP = 18; // coupler between cars
const SEAT = 38;
const SEAT_GAP = 8;
const CAR_PAD = 14;
const CABOOSE_W = 120;
const TRAIN_H = 172; // car top (incl. roof badge) → rail
const FLAG_H = 58;
const IRON = '#4B4B6A';
const PASSENGERS = ['🐶', '🐱', '🐰', '🐼', '🦊', '🐸', '🐯', '🐨', '🐷', '🐵', '🐻', '🐮', '🐹', '🐔', '🦁', '🐧'];

const carWidth = (car: TrainCar) => CAR_PAD * 2 + car.seats.length * SEAT + (car.seats.length - 1) * SEAT_GAP;

/**
 * Horizontal train: engine (level) → one car per unit → trophy caboose.
 * Finished lessons show up as animal passengers in the car's windows.
 */
export function PhonicsTrain({
  levelNumber,
  color,
  edge,
  cars,
  current,
  startLabel,
  allDone,
  palette,
}: {
  levelNumber: number;
  color: string;
  edge: string;
  cars: TrainCar[];
  /** Index of the car to highlight (first unfinished unit), or -1 when all done. */
  current: number;
  startLabel: string;
  allDone: boolean;
  /** Letter colours for the car name plates (the level's ink). */
  palette?: readonly string[];
}) {
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);

  // x of every car, to scroll the current one into view
  // and the first passenger of every car, so animals don't repeat car to car
  const xs: number[] = [];
  const seatOffsets: number[] = [];
  let x = 24 + ENGINE_W + GAP;
  let seats = 0;
  cars.forEach((c) => {
    xs.push(x);
    seatOffsets.push(seats);
    x += carWidth(c) + GAP;
    seats += c.seats.length;
  });
  const contentW = x + CABOOSE_W + 40;

  // chug in from the right, then park the current car mid-screen
  const drive = useSharedValue(width);
  const rattle = useSharedValue(0);
  useEffect(() => {
    drive.set(withTiming(0, { duration: 1800, easing: Easing.out(Easing.cubic) }));
    rattle.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false));
    const target = current >= 0 ? xs[current] + carWidth(cars[current]) / 2 : contentW;
    const id = setTimeout(
      () => scroll.current?.scrollTo({ x: Math.max(0, target - width / 2), animated: true }),
      1500,
    );
    return () => clearTimeout(id);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trainStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drive.value }] }));

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ width: contentW, height: TRAIN_H + FLAG_H + 30 }}>
      <Track width={contentW} />
      <Animated.View style={[styles.train, trainStyle]}>
        <Engine levelNumber={levelNumber} color={color} edge={edge} drive={drive} />
        {cars.map((car, i) => (
            <View key={car.key} style={styles.row}>
              <Coupler />
              <Car
                car={car}
                index={i}
                passengerOffset={seatOffsets[i]}
                active={i === current}
                startLabel={startLabel}
                drive={drive}
                rattle={rattle}
                palette={palette}
              />
            </View>
        ))}
        <Coupler />
        <Caboose done={allDone} active={current === -1} drive={drive} rattle={rattle} />
      </Animated.View>
    </ScrollView>
  );
}

/* ---------- pieces ---------- */

function Track({ width }: { width: number }) {
  const sleepers = Math.ceil(width / 24);
  return (
    <View style={[styles.track, { width }]} pointerEvents="none">
      {Array.from({ length: sleepers }, (_, i) => (
        <View key={i} style={[styles.sleeper, { left: i * 24 }]} />
      ))}
      <View style={styles.rail} />
    </View>
  );
}

function Wheel({ size, drive, left, top }: { size: number; drive: SharedValue<number>; left: number; top: number }) {
  // roll with the train: distance / radius
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${(drive.value / (size / 2)) * (180 / Math.PI)}deg` }] }));
  return (
    <Animated.View style={[styles.wheel, { width: size, height: size, borderRadius: size / 2, left, top }, spin]}>
      <View style={[styles.spoke, { width: size - 10 }]} />
      <View style={[styles.spoke, { width: size - 10, transform: [{ rotate: '90deg' }] }]} />
      <View style={styles.hub} />
    </Animated.View>
  );
}

function Smoke({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - t.value),
    transform: [{ translateY: -56 * t.value }, { translateX: 26 * t.value }, { scale: 0.5 + t.value }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.puff, style]} />;
}

function Engine({ levelNumber, color, edge, drive }: { levelNumber: number; color: string; edge: string; drive: SharedValue<number> }) {
  return (
    <View style={{ width: ENGINE_W, height: TRAIN_H }}>
      {/* smoke */}
      <View style={styles.smokeOrigin}>
        <Smoke delay={0} />
        <Smoke delay={600} />
        <Smoke delay={1200} />
      </View>
      {/* chimney */}
      <View style={[styles.chimneyCap, { backgroundColor: IRON }]} />
      <View style={[styles.chimney, { backgroundColor: IRON }]} />
      {/* boiler */}
      <View style={[styles.boiler, { backgroundColor: color, borderBottomColor: edge }]}>
        <View style={styles.boilerBand} />
        <View style={[styles.boilerBand, { left: 52 }]} />
      </View>
      {/* front with level number */}
      <View style={[styles.front, { backgroundColor: edge }]}>
        <View style={styles.frontInner}>
          <AppText style={[styles.frontNum, { color }]}>{levelNumber}</AppText>
        </View>
      </View>
      <View style={styles.lamp} />
      {/* cabin */}
      <View style={[styles.cabinRoof, { backgroundColor: edge }]} />
      <View style={[styles.cabin, { backgroundColor: color, borderBottomColor: edge }]}>
        <View style={styles.cabinWindow}>
          <AppText style={styles.driver}>🦁</AppText>
        </View>
      </View>
      {/* chassis + wheels */}
      <View style={[styles.chassis, { width: ENGINE_W - 6, left: 4 }]} />
      <View style={styles.cowcatcher} />
      <Wheel size={30} drive={drive} left={18} top={TRAIN_H - 34} />
      <Wheel size={30} drive={drive} left={56} top={TRAIN_H - 34} />
      <Wheel size={44} drive={drive} left={100} top={TRAIN_H - 48} />
    </View>
  );
}

function Coupler() {
  return (
    <View style={{ width: GAP, height: TRAIN_H }}>
      <View style={styles.coupler} />
    </View>
  );
}

function useRattle(rattle: SharedValue<number>, phase: number) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin((rattle.value + phase) * Math.PI * 2) * 1.6 }],
  }));
}

function Car({
  car,
  index,
  passengerOffset,
  active,
  startLabel,
  drive,
  rattle,
  palette,
}: {
  car: TrainCar;
  index: number;
  passengerOffset: number;
  active: boolean;
  startLabel: string;
  drive: SharedValue<number>;
  rattle: SharedValue<number>;
  palette?: readonly string[];
}) {
  const w = carWidth(car);
  const complete = car.seats.every(Boolean);
  const bob = useRattle(rattle, index * 0.17);

  return (
    <View style={{ width: w, height: TRAIN_H }}>
      {active && <StartFlag label={startLabel} color={car.color} />}
      <Animated.View style={[StyleSheet.absoluteFill, bob]}>
        <Pressy
          onPress={car.onPress}
          accessibilityRole="button"
          accessibilityLabel={car.accessibilityLabel ?? car.title}
          style={StyleSheet.absoluteFill}>
          <View style={[styles.roof, { width: w + 8, backgroundColor: car.edge }]} />
          <View style={[styles.body, { width: w, backgroundColor: car.color, borderBottomColor: car.edge }]}>
            <View style={styles.windows}>
              {car.seats.map((filled, s) => (
                <View key={s} style={[styles.window, filled && styles.windowLit]}>
                  {filled && <AppText style={styles.passenger}>{PASSENGERS[(passengerOffset + s) % PASSENGERS.length]}</AppText>}
                </View>
              ))}
            </View>
            <View style={styles.plate}>
              <RainbowText text={car.title} size={22} palette={palette} numberOfLines={1} />
            </View>
          </View>
          <View style={[styles.badge, { left: w / 2 - 18, borderBottomColor: car.edge }]}>
            <AppText style={[styles.badgeText, { color: complete ? colors.green : car.color }]}>
              {complete ? '✓' : car.number}
            </AppText>
          </View>
          {active && <View style={[styles.glow, { width: w + 14, borderColor: colors.yellow }]} pointerEvents="none" />}
        </Pressy>
      </Animated.View>
      <View style={[styles.chassis, { width: w - 8, left: 4 }]} />
      <Wheel size={30} drive={drive} left={12} top={TRAIN_H - 34} />
      <Wheel size={30} drive={drive} left={w - 42} top={TRAIN_H - 34} />
    </View>
  );
}

function Caboose({
  done,
  active,
  drive,
  rattle,
}: {
  done: boolean;
  active: boolean;
  drive: SharedValue<number>;
  rattle: SharedValue<number>;
}) {
  const bob = useRattle(rattle, 0.5);
  const shine = useSharedValue(1);
  useEffect(() => {
    if (!done) return;
    shine.set(withRepeat(withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })), -1));
  }, [done, shine]);
  const trophy = useAnimatedStyle(() => ({ transform: [{ scale: shine.value }] }));

  return (
    <View style={{ width: CABOOSE_W, height: TRAIN_H }}>
      {active && <StartFlag label="🎉" color={colors.yellow} />}
      <Animated.View style={[StyleSheet.absoluteFill, bob]} pointerEvents="none">
        <Animated.View style={[styles.trophyWrap, trophy, !done && { opacity: 0.45 }]}>
          <AppText style={styles.trophy}>🏆</AppText>
        </Animated.View>
        <View style={[styles.flatbed, { backgroundColor: done ? colors.yellow : colors.locked, borderBottomColor: done ? '#E0A800' : '#9EA3BF' }]}>
          <AppText style={styles.flatbedText}>{done ? '⭐⭐⭐' : '☆☆☆'}</AppText>
        </View>
      </Animated.View>
      <View style={[styles.chassis, { width: CABOOSE_W - 8, left: 4 }]} />
      <Wheel size={30} drive={drive} left={12} top={TRAIN_H - 34} />
      <Wheel size={30} drive={drive} left={CABOOSE_W - 42} top={TRAIN_H - 34} />
    </View>
  );
}

function StartFlag({ label, color }: { label: string; color: string }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 450, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [bob]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.flag, anim]}>
      <View style={[styles.flagPill, { backgroundColor: color }]}>
        <AppText style={styles.flagText}>{label}</AppText>
      </View>
      <View style={[styles.flagTip, { borderTopColor: color }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  train: { position: 'absolute', left: 24, top: FLAG_H, flexDirection: 'row', alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },

  /* track */
  track: { position: 'absolute', left: 0, top: FLAG_H + TRAIN_H - 6, height: 22 },
  sleeper: { position: 'absolute', top: 6, width: 12, height: 14, borderRadius: 3, backgroundColor: '#A0724E' },
  rail: { position: 'absolute', left: 0, right: 0, top: 4, height: 6, borderRadius: 3, backgroundColor: '#7E8AA8' },

  /* wheels */
  wheel: {
    position: 'absolute',
    backgroundColor: IRON,
    borderWidth: 4,
    borderColor: '#2E2D45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spoke: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: '#C9CDE4' },
  hub: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.yellow },

  /* engine */
  smokeOrigin: { position: 'absolute', left: 22, top: 14, width: 34, height: 34 },
  puff: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF' },
  chimneyCap: { position: 'absolute', left: 22, top: 30, width: 34, height: 12, borderRadius: 4 },
  chimney: { position: 'absolute', left: 28, top: 40, width: 22, height: 34 },
  boiler: {
    position: 'absolute',
    left: 20,
    top: 70,
    width: 92,
    height: 66,
    borderTopLeftRadius: 12,
    borderBottomWidth: 6,
    ...shadow,
  },
  boilerBand: { position: 'absolute', left: 24, top: 0, bottom: 0, width: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
  front: {
    position: 'absolute',
    left: 0,
    top: 68,
    width: 62,
    height: 70,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frontInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frontNum: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  lamp: {
    position: 'absolute',
    left: 22,
    top: 56,
    width: 18,
    height: 14,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: colors.yellow,
  },
  cabinRoof: { position: 'absolute', left: 92, top: 22, width: 66, height: 16, borderRadius: 8 },
  cabin: {
    position: 'absolute',
    left: 98,
    top: 34,
    width: 54,
    height: 102,
    borderBottomWidth: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    ...shadow,
  },
  cabinWindow: {
    marginTop: 10,
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DDF3FF',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driver: { fontSize: 22, lineHeight: 28 },
  cowcatcher: {
    position: 'absolute',
    left: -8,
    top: TRAIN_H - 30,
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderLeftWidth: 18,
    borderTopColor: '#E0A800',
    borderLeftColor: 'transparent',
  },
  chassis: { position: 'absolute', top: TRAIN_H - 40, height: 12, borderRadius: 6, backgroundColor: IRON },
  coupler: { position: 'absolute', top: TRAIN_H - 38, left: -4, right: -4, height: 7, borderRadius: 4, backgroundColor: '#2E2D45' },

  /* car */
  roof: { position: 'absolute', left: -4, top: 20, height: 16, borderRadius: 8 },
  body: {
    position: 'absolute',
    left: 0,
    top: 32,
    height: 100,
    borderRadius: 14,
    borderBottomWidth: 6,
    paddingHorizontal: CAR_PAD,
    paddingTop: 12,
    gap: 8,
    ...shadow,
  },
  windows: { flexDirection: 'row', gap: SEAT_GAP },
  window: {
    width: SEAT,
    height: SEAT,
    borderRadius: 10,
    backgroundColor: 'rgba(221,243,255,0.75)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowLit: { backgroundColor: '#FFF6C9' },
  passenger: { fontSize: 22, lineHeight: 28 },
  plate: { backgroundColor: '#FFFDF5', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22 },
  glow: { position: 'absolute', left: -7, top: 14, height: 126, borderRadius: 20, borderWidth: 4 },

  /* caboose */
  trophyWrap: { position: 'absolute', left: 0, right: 0, top: 26, alignItems: 'center' },
  trophy: { fontSize: 58, lineHeight: 70 },
  flatbed: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 92,
    height: 40,
    borderRadius: 12,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  flatbedText: { fontSize: 14, color: '#fff' },

  /* start flag */
  flag: { position: 'absolute', top: -52, left: 0, right: 0, alignItems: 'center', zIndex: 3 },
  flagPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 3, borderColor: '#fff' },
  flagText: { color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  flagTip: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
