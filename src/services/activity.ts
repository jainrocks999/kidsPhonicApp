import AsyncStorage from '@react-native-async-storage/async-storage';
import monetization from '../../monetization.config.json';

const cfg = monetization.activityAd;

type Saved = {
  engagement: number;
  streakDays: number;
  lastDay: string;
};

type Session = {
  startedAt: number;
  firstBreakSeen: boolean;
  breaksSinceAd: number;
  lastAdAt: number;
  lastTouchAt: number;
  tapTimes: number[];
  navTimes: number[];
  priorityBreak: boolean;
  idleSkip: boolean;
  wrongStreak: number;
  longSessionCredited: boolean;
};

const KEY = 'activity-ad-v1';

const saved: Saved = { engagement: 0.25, streakDays: 0, lastDay: '' };
const session: Session = {
  startedAt: Date.now(),
  firstBreakSeen: false,
  breaksSinceAd: 0,
  lastAdAt: 0,
  lastTouchAt: Date.now(),
  tapTimes: [],
  navTimes: [],
  priorityBreak: false,
  idleSkip: false,
  wrongStreak: 0,
  longSessionCredited: false,
};

let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayNumber(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
  }, 250);
}

function nudge(target: number) {
  saved.engagement = clamp(cfg.ewmaAlpha * target + (1 - cfg.ewmaAlpha) * saved.engagement, 0, 1);
  persist();
}

export async function initActivity(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>;
      if (typeof parsed.engagement === 'number') saved.engagement = clamp(parsed.engagement, 0, 1);
      if (typeof parsed.streakDays === 'number') saved.streakDays = Math.max(0, Math.floor(parsed.streakDays));
      if (typeof parsed.lastDay === 'string') saved.lastDay = parsed.lastDay;
    }
  } catch {
    saved.lastDay = '';
  }

  const today = dayKey();
  if (saved.lastDay) {
    const gap = dayNumber(today) - dayNumber(saved.lastDay);
    if (gap === 1) {
      saved.streakDays += 1;
      nudge(1);
    } else if (gap >= cfg.returningGapDays) {
      saved.streakDays = 1;
      nudge(0);
    }
  } else {
    saved.streakDays = 1;
  }
  saved.lastDay = today;
  persist();
}

export function reportTouch(): void {
  const now = Date.now();
  if (now - session.lastTouchAt >= cfg.idleSeconds * 1000) session.idleSkip = true;
  session.lastTouchAt = now;
  const window = cfg.rapidTapWindowSeconds * 1000;
  session.tapTimes = session.tapTimes.filter((time) => now - time <= window);
  session.tapTimes.push(now);
  if (session.tapTimes.length >= cfg.rapidTapThreshold) {
    session.priorityBreak = true;
    session.tapTimes = [];
  }
}

/**
 * Call on every next / previous tap. Returns true when the kid is flipping through fast
 * (many next / prev taps in a short time), which counts as fast activity.
 */
export function reportNav(): boolean {
  const now = Date.now();
  const window = cfg.rapidNavWindowSeconds * 1000;
  session.navTimes = session.navTimes.filter((time) => now - time <= window);
  session.navTimes.push(now);
  if (session.navTimes.length < cfg.rapidNavThreshold) return false;
  session.navTimes = [];
  session.priorityBreak = true;
  return true;
}

export function reportCorrect(): void {
  session.wrongStreak = 0;
}

export function reportWrong(): void {
  session.wrongStreak += 1;
  if (session.wrongStreak >= cfg.wrongStreakThreshold) {
    session.priorityBreak = true;
    session.wrongStreak = 0;
    nudge(0);
  }
}

export function reportProgress(stars: number): void {
  if (stars <= cfg.lowStarThreshold) {
    session.priorityBreak = true;
    session.wrongStreak = 0;
    nudge(0);
  } else {
    session.wrongStreak = 0;
    nudge(1);
  }
}

export function reportAbandon(): void {
  nudge(0);
}

export function interstitialAllowed(): boolean {
  const now = Date.now();
  // Set by fast tapping or a run of wrong answers. Stays pending until an ad is really shown
  // (see noteAdShown), so a break that falls inside the gap doesn't use it up.
  const priority = session.priorityBreak;

  if (!session.firstBreakSeen && !priority) {
    session.firstBreakSeen = true;
    session.breaksSinceAd += 1;
    return false;
  }
  session.firstBreakSeen = true;

  if (!priority && session.idleSkip) {
    session.idleSkip = false;
    session.breaksSinceAd += 1;
    return false;
  }
  if (priority) {
    session.idleSkip = false;
    session.wrongStreak = 0;
    session.tapTimes = [];
  }

  if (!priority) {
    if (!session.longSessionCredited && now - session.startedAt >= cfg.longSessionSeconds * 1000) {
      session.longSessionCredited = true;
      nudge(1);
    }
    session.breaksSinceAd += 1;
    if (session.breaksSinceAd <= Math.round(cfg.maxSkippedBreaks * saved.engagement)) return false;
  }

  // Fast / wrong activity has its own fixed gap, not the engagement-scaled one.
  if (priority) return now - session.lastAdAt >= cfg.priorityCooldownSeconds * 1000;

  const base = monetization.admob.interstitialCooldownSeconds * 1000;
  const cooldown = Math.min(base * (1 + cfg.engagementWeight * saved.engagement), cfg.maxCooldownSeconds * 1000);
  return now - session.lastAdAt >= cooldown;
}

export function noteAdShown(): void {
  session.lastAdAt = Date.now();
  session.breaksSinceAd = 0;
  session.idleSkip = false;
  session.wrongStreak = 0;
  session.tapTimes = [];
  session.navTimes = [];
  session.priorityBreak = false;
}
