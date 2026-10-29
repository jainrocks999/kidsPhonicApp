import type { Level, Unit, Word } from '@/data/types';
import type { PromptId } from '@/assets';
import type { StringKey } from '@/i18n';

export type GameId = 'bubble' | 'pick' | 'fill' | 'spell' | 'memory' | 'drag';

export interface GameProps {
  level: Level;
  unit: Unit;
  /** All words taught in the unit. */
  words: Word[];
  /** Letters / patterns taught in the unit (e.g. "A", "ad"). */
  patterns: string[];
  onFinish: (score: number) => void;
}

export const GAME_META: Record<
  GameId,
  { emoji: string; title: StringKey | string; guide: StringKey; prompt: PromptId; doneTitle: StringKey; doneSubtitle: StringKey }
> = {
  bubble: { emoji: '🫧', title: 'bubble_game_title', guide: 'bubble_game_guide', prompt: 'game_bubble', doneTitle: 'bubble_game_celebration_title', doneSubtitle: 'bubble_game_celebration_subtitle' },
  pick: { emoji: '🖼️', title: 'Pick the Word', guide: 'pick_word_guide', prompt: 'game_pick', doneTitle: 'pick_word_celebration_title', doneSubtitle: 'pick_word_celebration_subtitle' },
  fill: { emoji: '🔍', title: 'Missing Letter', guide: 'fill_letter_guide', prompt: 'game_fill', doneTitle: 'fill_letter_celebration_title', doneSubtitle: 'fill_letter_celebration_subtitle' },
  spell: { emoji: '🔤', title: 'Spell It', guide: 'spell_letters_guide', prompt: 'game_spell', doneTitle: 'spell_letters_celebration_title', doneSubtitle: 'spell_letters_celebration_subtitle' },
  memory: { emoji: '🃏', title: 'memory_match_title', guide: 'memory_match_guide', prompt: 'game_memory', doneTitle: 'memory_match_complete_title', doneSubtitle: 'memory_match_complete_subtitle' },
  drag: { emoji: '🧲', title: 'Word Match', guide: 'drag_words_guide', prompt: 'game_drag', doneTitle: 'drag_words_celebration_title', doneSubtitle: 'drag_words_celebration_subtitle' },
};

/** Level 1 = letters, so spelling / fill games use short words only. */
export const GAMES_FOR_LEVEL = (levelNumber: number): GameId[] =>
  levelNumber === 1 ? ['bubble', 'pick', 'memory', 'drag', 'fill', 'spell'] : ['pick', 'fill', 'spell', 'memory', 'drag', 'bubble'];

export const ROUNDS = 5;
