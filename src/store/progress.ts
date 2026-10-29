import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';
import type { Level, Unit } from '@/data/types';

interface ProgressState {
  /** lessonId -> stars (1–3) */
  lessons: Record<string, number>;
  stories: Record<string, true>;
  /** `${unitId}:${gameId}` -> true */
  games: Record<string, true>;
  completeLesson: (lessonId: string, stars: number) => void;
  completeStory: (storyId: string) => void;
  completeGame: (unitId: string, gameId: string) => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      lessons: {},
      stories: {},
      games: {},
      completeLesson: (id, stars) =>
        set((s) => ({ lessons: { ...s.lessons, [id]: Math.max(stars, s.lessons[id] ?? 0) } })),
      completeStory: (id) => set((s) => ({ stories: { ...s.stories, [id]: true } })),
      completeGame: (unitId, gameId) => set((s) => ({ games: { ...s.games, [`${unitId}:${gameId}`]: true } })),
      reset: () => set({ lessons: {}, stories: {}, games: {} }),
    }),
    { name: 'progress', storage: persistStorage },
  ),
);

export const isUnitComplete = (unit: Unit, lessons: Record<string, number>) =>
  unit.lessons.every((l) => lessons[l.id]);

/** Units unlock in order: a unit opens once the previous unit's lessons are all done. */
export function isUnitUnlocked(level: Level, unitIndex: number, lessons: Record<string, number>) {
  return unitIndex === 0 || isUnitComplete(level.units[unitIndex - 1], lessons);
}

export function levelProgress(level: Level, lessons: Record<string, number>) {
  const all = level.units.flatMap((u) => u.lessons);
  return all.filter((l) => lessons[l.id]).length / all.length;
}
