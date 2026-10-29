import curriculumJson from '@rn_assets/data/curriculum.json';
import story1 from '@rn_assets/stories/level_1.json';
import story2 from '@rn_assets/stories/level_2.json';
import story3 from '@rn_assets/stories/level_3.json';
import story4 from '@rn_assets/stories/level_4.json';
import story5 from '@rn_assets/stories/level_5.json';
import blend2 from '@rn_assets/data/blend_meta/level_2.json';
import blend3 from '@rn_assets/data/blend_meta/level_3.json';
import blend4 from '@rn_assets/data/blend_meta/level_4.json';
import blend5 from '@rn_assets/data/blend_meta/level_5.json';
import chant1 from '@rn_assets/data/chant_meta/level_1.json';
import chant2 from '@rn_assets/data/chant_meta/level_2.json';
import chant3 from '@rn_assets/data/chant_meta/level_3.json';
import chant4 from '@rn_assets/data/chant_meta/level_4.json';
import chant5 from '@rn_assets/data/chant_meta/level_5.json';
import type { BlendChain, ChantMeta, Lesson, LessonRef, Level, Story, Unit } from './types';

export const levels: Level[] = (curriculumJson as { levels: Level[] }).levels;
export const stories: Story[] = [story1, story2, story3, story4, story5].flat() as Story[];

const blendByLesson = new Map<string, BlendChain[]>(
  ([blend2, blend3, blend4, blend5].flat() as { lesson_id: string; chains: BlendChain[] }[]).map((b) => [
    b.lesson_id,
    b.chains,
  ]),
);
const chantByLesson = new Map<string, ChantMeta>(
  ([chant1, chant2, chant3, chant4, chant5].flat() as ChantMeta[]).map((c) => [c.lesson_id, c]),
);

const pad2 = (n: number) => String(n).padStart(2, '0');
export const slug = (word: string) => word.toLowerCase().replace(/[\s-]+/g, '_');

/** "L1U01_A_apple" — matches the folder names under rn_assets/audio/level_N/unit_NN/. */
export function lessonAssetKey(level: Level, unit: Unit, lesson: Lesson) {
  return `${level.id}U${pad2(unit.number)}_${lesson.letter}_${slug(lesson.words[0].word)}`;
}

const lessonIndex = new Map<string, LessonRef>();
for (const level of levels) {
  for (const unit of level.units) {
    for (const lesson of unit.lessons) {
      lessonIndex.set(lesson.id, { level, unit, lesson, assetKey: lessonAssetKey(level, unit, lesson) });
    }
  }
}

export const getLevel = (id: string) => levels.find((l) => l.id === id);
export const getLessonRef = (lessonId: string) => lessonIndex.get(lessonId);

export function getUnit(unitId: string): { level: Level; unit: Unit } | undefined {
  for (const level of levels) {
    const unit = level.units.find((u) => u.id === unitId);
    if (unit) return { level, unit };
  }
}

export const getStory = (id: string) => stories.find((s) => s.id === id);
export const getUnitStory = (level: Level, unit: Unit) =>
  stories.find((s) => s.level === level.number && s.unit_number === unit.number);

export const getBlendChains = (assetKey: string) => blendByLesson.get(assetKey) ?? [];
export const getChantMeta = (assetKey: string) => chantByLesson.get(assetKey);

/** Ordered list of lessons in the next unit / level, used for "Next lesson". */
export function nextLessonId(lessonId: string): string | undefined {
  const all = [...lessonIndex.keys()];
  return all[all.indexOf(lessonId) + 1];
}
