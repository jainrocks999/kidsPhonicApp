export type WordDisplay = { type: 'emoji'; char: string } | { type: 'image'; path: string };

export interface Word {
  word: string;
  emoji: string;
  displays?: WordDisplay[];
  /** L4+/L5: word split into onset/pattern chunks, e.g. ["bl", "ack"]. */
  split?: string[];
  /** Index into `split` of the chunk carrying the lesson's pattern. */
  patternIndex?: number;
}

export interface Lesson {
  id: string;
  letter: string;
  displayLetter: string;
  soundSpelling: string;
  sentence: string;
  stretchedWord: string;
  orderIndex: number;
  words: Word[];
  chantTexts: string[];
  chantOrder: number[];
}

export interface Unit {
  id: string;
  number: number;
  title: string;
  themeChip: string | null;
  orderIndex: number;
  lessons: Lesson[];
}

export interface Level {
  id: string;
  number: number;
  title: string;
  isPremium: boolean;
  ageRange: string;
  orderIndex: number;
  units: Unit[];
}

export interface WordTiming {
  word: string;
  start_ms: number;
  end_ms: number;
}

export interface StoryScene {
  scene: number;
  name: string;
  duration_sec: number;
  text: string;
  word_timings?: WordTiming[];
}

export interface Story {
  id: string;
  title: string;
  level: number;
  unit_number: number;
  phonics_used: string[];
  narrator_voice: string;
  duration_seconds: number;
  scenes: StoryScene[];
  title_timings?: WordTiming[];
}

export interface BlendSegment {
  /** t = target sound, sr = sound-out/stretched read, w = whole word */
  card: 't' | 'sr' | 'w' | string;
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface BlendChain {
  word: string;
  audio: string;
  duration_ms: number;
  segments: BlendSegment[];
}

export interface ChantMeta {
  lesson_id: string;
  start_ms: number;
  speed_ms: number;
  edge_speed_ms: number;
  slide_ms?: number;
}

/** A lesson resolved with its position in the curriculum. */
export interface LessonRef {
  level: Level;
  unit: Unit;
  lesson: Lesson;
  /** Asset folder key, e.g. "L1U01_A_apple". */
  assetKey: string;
}

/** [startMs, endMs] of one spoken burst. */
export type Span = [number, number];

/** Measured from the lesson audio by scripts/generate-voice-timing.py. */
export interface VoiceTiming {
  /** Every voiced burst of 00_sound_intro.mp3. */
  intro?: Span[];
  /**
   * 02_chant.mp3 as heard: first round one entry per line ("A-A-Apple", with per-chunk spans);
   * sung rounds one entry per word burst (`word: true` → light that card's word).
   */
  chant?: { line: number; start: number; end: number; chunks: Span[] | null; word?: boolean }[];
  /** Bursts of the sung part — used to dance when its lines aren't reliable. */
  beats?: Span[];
}
