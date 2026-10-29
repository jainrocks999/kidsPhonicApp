import { ASSETS } from './registry.generated';
import { slug } from '@/data/curriculum';
import type { LessonRef, Story, Word } from '@/data/types';

export type AssetId = number;

const keys = Object.keys(ASSETS);
const pad2 = (n: number) => String(n).padStart(2, '0');

export const asset = (path: string): AssetId | undefined => ASSETS[path];

/** First asset under `dir` whose file name starts with `prefix` (e.g. "01_"). */
function findByPrefix(dir: string, prefix: string): AssetId | undefined {
  const start = `${dir}/${prefix}`;
  const key = keys.find((k) => k.startsWith(start) && !k.slice(start.length).includes('/'));
  return key ? ASSETS[key] : undefined;
}

function lessonDir(ref: LessonRef) {
  return `audio/level_${ref.level.number}/unit_${pad2(ref.unit.number)}/${ref.assetKey}`;
}

/** Lesson media. Returns undefined when the pack isn't bundled — callers fall back to TTS. */
export const lessonAudio = {
  soundIntro: (ref: LessonRef) => asset(`${lessonDir(ref)}/00_sound_intro.mp3`),
  chant: (ref: LessonRef) => asset(`${lessonDir(ref)}/02_chant.mp3`),
  vocab: (ref: LessonRef, i: number) => findByPrefix(`${lessonDir(ref)}/vocab`, `${pad2(i + 1)}_`),
  blend: (ref: LessonRef, i: number) => findByPrefix(`${lessonDir(ref)}/blend`, `${pad2(i + 1)}_`),
  blendIntro: (ref: LessonRef, i: number) => findByPrefix(`${lessonDir(ref)}/blend_intro`, `${pad2(i)}_`),
};

/** Letter / pattern sound: phonemes (a–z) first, then rime sounds. */
export function patternSound(pattern: string): AssetId | undefined {
  const p = pattern.toLowerCase().replace(/[\s-]+/g, '_');
  return asset(`audio/phonemes/${p}.mp3`) ?? asset(`audio/find_rime/${p}.mp3`) ?? asset(`audio/rimes/${p}.mp3`);
}

/** Picture for a word: vocab image when the curriculum lists one, otherwise null (render emoji). */
export function wordImage(word: Word): AssetId | undefined {
  for (const d of word.displays ?? []) {
    if (d.type === 'image') {
      const found = asset(d.path.replace(/^files\//, ''));
      if (found) return found;
    }
  }
  return asset(`images/vocab/${slug(word.word)}.webp`);
}

export const levelImage = (levelNumber: number) => asset(`images/levels/level_${levelNumber}.webp`);

function storyBase(story: Story, kind: 'audio' | 'images') {
  return `${kind}/level_${story.level}/stories/${story.id}`;
}
export const storyAudio = {
  scene: (story: Story, scene: number) => asset(`${storyBase(story, 'audio')}/scene_${scene}.mp3`),
  title: (story: Story) => asset(`sfx/story_titles/${story.id}.mp3`),
};
export const storyImage = (story: Story, scene: number) =>
  asset(`${storyBase(story, 'images')}/scene_${scene}.webp`) ?? asset(`${storyBase(story, 'images')}/scene_${scene}.png`);

export type PromptId =
  | 'almost' | 'correct' | 'game_bubble' | 'game_drag' | 'game_fill' | 'game_memory' | 'game_pick' | 'game_spell'
  | 'intro' | 'lesson_done' | 'lets_go' | 'listen_again' | 'locked' | 'parent_gate' | 'parent_handoff'
  | 'pick_lesson' | 'pick_level' | 'pick_unit' | 'step_blend' | 'step_chant' | 'step_done' | 'step_identify'
  | 'step_match' | 'step_sound' | 'step_story' | 'step_trace' | 'step_vocab' | 'tap_next' | 'unit_done'
  | 'unlock_story_games' | 'welcome' | 'wrong';

export const promptAudio = (id: PromptId, lang: 'en' | 'vi') =>
  asset(`sfx/prompts/${lang}/vp_${id}.mp3`) ?? asset(`sfx/prompts/en/vp_${id}.mp3`);

export const sfx = {
  click: asset('sfx/click.mp3'),
  correct: asset('sfx/correct.mp3'),
  complete: asset('sfx/lesson_complete.mp3'),
  tryAgain: asset('sfx/voice/try_again.mp3'),
  praise: ['great_job', 'nice', 'well_done', 'you_got_it'].map((p) => asset(`sfx/voice/praise_${p}.mp3`)),
};
