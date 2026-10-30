/**
 * Handwriting strokes for A–Z / a–z on a 100 × 100 box, in teaching order and direction
 * (ball-and-stick style). Every stroke is a dense polyline, so the same points draw the
 * tracing "road" and check the child's finger — the two can never disagree.
 *
 * Guide lines: top 12 · x-height (mid) 47 · baseline 82 · descender 98.
 * Angles are in degrees, 0 = 3 o'clock, -90 = 12 o'clock (y grows down);
 * a decreasing angle runs counter-clockwise on screen.
 */
export type Pt = { x: number; y: number };
export type Stroke = Pt[];

export const GUIDE = { top: 12, mid: 47, base: 82, desc: 98 };
const STEP = 1.5;

const line = (x1: number, y1: number, x2: number, y2: number): Pt[] => {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n }));
};

const arc = (cx: number, cy: number, rx: number, ry: number, from: number, to: number): Pt[] => {
  const len = (Math.abs(to - from) * Math.PI * (rx + ry)) / 360;
  const n = Math.max(2, Math.ceil(len / STEP));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
};

/** Joins segments into one stroke (dropping the duplicated joint points). */
const path = (...segs: Pt[][]): Stroke => segs.flatMap((s, i) => (i ? s.slice(1) : s));
/** A dot (i, j) — finished by touching it. */
const dot = (x: number, y: number): Stroke => [{ x, y }];

// shared shapes
const bowlP = path(line(28, 12, 52, 12), arc(52, 29.5, 17.5, 17.5, -90, 90), line(52, 47, 28, 47));
const circleO = arc(50, 47, 30, 35, -90, -450);
const smallA = arc(50, 64.5, 20, 17.5, -10, -370);

const UPPER: Record<string, Stroke[]> = {
  A: [line(50, 12, 22, 82), line(50, 12, 78, 82), line(33, 58, 67, 58)],
  B: [
    line(28, 12, 28, 82),
    bowlP,
    path(line(28, 47, 55, 47), arc(55, 64.5, 17.5, 17.5, -90, 90), line(55, 82, 28, 82)),
  ],
  C: [arc(55, 47, 30, 35, -40, -320)],
  D: [line(28, 12, 28, 82), path(line(28, 12, 42, 12), arc(42, 47, 32, 35, -90, 90), line(42, 82, 28, 82))],
  E: [line(30, 12, 30, 82), line(30, 12, 74, 12), line(30, 47, 66, 47), line(30, 82, 74, 82)],
  F: [line(30, 12, 30, 82), line(30, 12, 74, 12), line(30, 47, 66, 47)],
  G: [path(arc(55, 47, 30, 35, -40, -360), line(85, 47, 60, 47))],
  H: [line(26, 12, 26, 82), line(74, 12, 74, 82), line(26, 47, 74, 47)],
  I: [line(50, 12, 50, 82), line(32, 12, 68, 12), line(32, 82, 68, 82)],
  J: [path(line(66, 12, 66, 62), arc(46, 62, 20, 20, 0, 180))],
  K: [line(30, 12, 30, 82), line(72, 12, 30, 52), line(43, 40, 74, 82)],
  L: [path(line(30, 12, 30, 82), line(30, 82, 72, 82))],
  M: [line(20, 12, 20, 82), path(line(20, 12, 50, 60), line(50, 60, 80, 12), line(80, 12, 80, 82))],
  N: [line(26, 12, 26, 82), path(line(26, 12, 74, 82), line(74, 82, 74, 12))],
  O: [circleO],
  P: [line(28, 12, 28, 82), bowlP],
  Q: [circleO, line(58, 64, 80, 88)],
  R: [line(28, 12, 28, 82), bowlP, line(46, 47, 74, 82)],
  S: [path(arc(50, 29.5, 24, 17.5, -20, -270), arc(50, 64.5, 24, 17.5, -90, 160))],
  T: [line(22, 12, 78, 12), line(50, 12, 50, 82)],
  U: [path(line(26, 12, 26, 58), arc(50, 58, 24, 24, 180, 0), line(74, 58, 74, 12))],
  V: [path(line(24, 12, 50, 82), line(50, 82, 76, 12))],
  W: [path(line(16, 12, 32, 82), line(32, 82, 50, 32), line(50, 32, 68, 82), line(68, 82, 84, 12))],
  X: [line(26, 12, 74, 82), line(74, 12, 26, 82)],
  Y: [line(26, 12, 50, 47), path(line(74, 12, 50, 47), line(50, 47, 50, 82))],
  Z: [path(line(26, 12, 74, 12), line(74, 12, 26, 82), line(26, 82, 74, 82))],
};

const LOWER: Record<string, Stroke[]> = {
  a: [smallA, line(70, 47, 70, 82)],
  b: [line(30, 12, 30, 82), arc(48, 64.5, 18, 17.5, 180, 540)],
  c: [arc(52, 64.5, 20, 17.5, -40, -320)],
  d: [smallA, line(70, 12, 70, 82)],
  e: [path(line(30, 64.5, 70, 64.5), arc(50, 64.5, 20, 17.5, 0, -320))],
  f: [path(arc(62, 24, 12, 12, -30, -180), line(50, 24, 50, 82)), line(36, 47, 66, 47)],
  g: [smallA, path(line(70, 47, 70, 86), arc(52, 86, 18, 12, 0, 160))],
  h: [line(30, 12, 30, 82), path(arc(48, 62, 18, 15, 180, 360), line(66, 62, 66, 82))],
  i: [line(50, 47, 50, 82), dot(50, 30)],
  j: [path(line(56, 47, 56, 86), arc(42, 86, 14, 12, 0, 160)), dot(56, 30)],
  k: [line(30, 12, 30, 82), line(66, 45, 30, 68), line(42, 61, 68, 82)],
  l: [line(50, 12, 50, 82)],
  m: [
    line(20, 47, 20, 82),
    path(arc(35, 62, 15, 15, 180, 360), line(50, 62, 50, 82)),
    path(arc(65, 62, 15, 15, 180, 360), line(80, 62, 80, 82)),
  ],
  n: [line(30, 47, 30, 82), path(arc(48, 62, 18, 15, 180, 360), line(66, 62, 66, 82))],
  o: [arc(50, 64.5, 20, 17.5, -90, -450)],
  p: [line(30, 47, 30, 98), arc(48, 64.5, 18, 17.5, 180, 540)],
  q: [smallA, line(70, 47, 70, 98)],
  r: [line(34, 47, 34, 82), arc(52, 62, 18, 15, 180, 320)],
  s: [path(arc(50, 55.75, 16, 8.75, -20, -270), arc(50, 73.25, 16, 8.75, -90, 160))],
  t: [line(50, 22, 50, 82), line(36, 47, 66, 47)],
  u: [path(line(30, 47, 30, 64), arc(48, 64, 18, 18, 180, 0), line(66, 64, 66, 47)), line(66, 47, 66, 82)],
  v: [path(line(28, 47, 50, 82), line(50, 82, 72, 47))],
  w: [path(line(16, 47, 32, 82), line(32, 82, 50, 56), line(50, 56, 68, 82), line(68, 82, 84, 47))],
  x: [line(30, 47, 70, 82), line(70, 47, 30, 82)],
  y: [line(30, 47, 50, 82), line(70, 47, 36, 98)],
  z: [path(line(30, 47, 70, 47), line(70, 47, 30, 82), line(30, 82, 70, 82))],
};

export function strokesFor(letter: string): Stroke[] | undefined {
  return UPPER[letter] ?? LOWER[letter];
}

// ---------- checking a child's finger against the strokes ----------

/** How far (in the 100-unit box) the finger may stray and still count as "on the letter". */
export const TOL = 10;
/** The ink only creeps forward this many samples (~20 units) at a time — no skipping ahead. */
const LOOKAHEAD = 14;
/** Straying further than TOL × this mid-stroke wipes that stroke's ink (stops scribbling through). */
const SLIP = 2.2;

export type Ink = {
  /** current stroke */
  stroke: number;
  /** how far along the current stroke the ink has reached (sample index) */
  prog: number;
  /** finger samples on / off the letter — the accuracy score */
  on: number;
  off: number;
  /** the finger's path for the current touch, exactly as drawn */
  trail: Pt[];
  /** earlier finger paths (one per touch), kept on screen until the letter is cleared */
  lines: Pt[][];
  /** was the latest finger point on the letter? */
  lastOn: boolean;
  /** times a stroke was wiped for leaving the road */
  slips: number;
  /** where the ink stood when this touch began — a touch that got nowhere is wiped on lift */
  mark: { stroke: number; prog: number };
};

export const FRESH: Ink = { stroke: 0, prog: 0, on: 0, off: 0, trail: [], lines: [], lastOn: true, slips: 0, mark: { stroke: 0, prog: 0 } };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Guided tracing, one stroke at a time, in the right order and direction. The ink snaps onto the
 * letter and only moves forward when the finger follows the stroke, so scribbling can't finish it;
 * the stars come from how much of the finger's path stayed on the letter (measured by distance,
 * so a fast swipe and a slow one weigh the same).
 */
export function advance(ink: Ink, p: Pt, strokes: Stroke[]): Ink {
  if (!ink.trail.length) ink = { ...ink, mark: { stroke: ink.stroke, prog: ink.prog } };
  const last = ink.trail[ink.trail.length - 1];
  const n = last ? Math.floor(dist(last, p) / STEP) : 0;
  let next = ink;
  for (let i = 1; i <= n; i++) {
    next = step(next, { x: last.x + ((p.x - last.x) * i) / (n + 1), y: last.y + ((p.y - last.y) * i) / (n + 1) }, strokes, false);
  }
  return step(next, p, strokes, true);
}

function step(ink: Ink, p: Pt, strokes: Stroke[], keep: boolean): Ink {
  const s = strokes[ink.stroke];
  if (!s) return ink;
  const near = (st: Stroke, d = TOL) => st.some((q) => dist(p, q) < d);
  const onLetter = strokes.some((st, i) => i <= ink.stroke && near(st));
  const counted: Ink = {
    ...ink,
    trail: keep ? [...ink.trail, p] : ink.trail,
    on: ink.on + (onLetter ? 1 : 0),
    off: ink.off + (onLetter ? 0 : 1),
    lastOn: onLetter,
  };

  if (s.length === 1) return near(s, TOL * 1.3) ? { ...counted, stroke: ink.stroke + 1, prog: 0 } : counted;

  // wandered right off the road in the middle of a stroke → that stroke starts over
  // (and the line drawn in this touch is wiped, so the child sees it)
  if (ink.prog > 0 && ink.trail.length > 0 && !near(s, TOL * SLIP)) return { ...counted, trail: [p], prog: 0, slips: ink.slips + 1 };

  let prog = ink.prog;
  for (let i = prog; i < Math.min(s.length, prog + LOOKAHEAD); i++) {
    if (dist(p, s[i]) < TOL) prog = i;
  }
  return prog >= s.length - 3 ? { ...counted, stroke: ink.stroke + 1, prog: 0 } : { ...counted, prog };
}

/**
 * Finger lifted. A line that moved the letter forward stays on the paper; one that got nowhere
 * (wrong place, wrong way) is wiped, so mistakes clean themselves up.
 */
export function lift(ink: Ink): Ink {
  const moved = ink.stroke > ink.mark.stroke || ink.prog > ink.mark.prog;
  return { ...ink, lines: moved && ink.trail.length > 1 ? [...ink.lines, ink.trail] : ink.lines, trail: [] };
}

/** Square window around a letter (in letter units), padded for the road — so small letters fill the card. */
export function frameFor(strokes: Stroke[], pad = 12, min = 74) {
  const all = strokes.flat();
  if (!all.length) return { x: 0, y: 0, size: 100 };
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const size = Math.max(min, x1 - x0 + pad * 2, y1 - y0 + pad * 2);
  return { x: (x0 + x1) / 2 - size / 2, y: (y0 + y1) / 2 - size / 2, size };
}
