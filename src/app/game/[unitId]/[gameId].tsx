import { useEffect, useMemo, useState } from 'react';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Celebration } from '@/components/Celebration';
import { Screen } from '@/components/Screen';
import { promptAudio } from '@/assets';
import { getUnit } from '@/data/curriculum';
import type { Word } from '@/data/types';
import { BubblePop } from '@/features/games/BubblePop';
import { DragWords } from '@/features/games/DragWords';
import { FillLetter } from '@/features/games/FillLetter';
import { MemoryMatch } from '@/features/games/MemoryMatch';
import { PickWord } from '@/features/games/PickWord';
import { SpellLetters } from '@/features/games/SpellLetters';
import { GAME_META, type GameId, type GameProps } from '@/features/games/types';
import { logEvent } from '@/services/analytics';
import { play, stopVoice } from '@/services/audio';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useT, type StringKey } from '@/i18n';
import { space } from '@/theme';

const GAMES: Record<GameId, (p: GameProps) => React.JSX.Element> = {
  bubble: BubblePop,
  pick: PickWord,
  fill: FillLetter,
  spell: SpellLetters,
  memory: MemoryMatch,
  drag: DragWords,
};

export default function GameScreen() {
  const t = useT();
  const { unitId, gameId } = useLocalSearchParams<{ unitId: string; gameId: GameId }>();
  const found = getUnit(unitId);
  const language = useSettings((s) => s.language);
  const completeGame = useProgress((s) => s.completeGame);
  const [score, setScore] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);
  const meta = GAME_META[gameId];

  const words = useMemo(() => {
    const seen = new Map<string, Word>();
    found?.unit.lessons.flatMap((l) => l.words).forEach((w) => seen.set(w.word, w));
    return [...seen.values()];
  }, [found]);
  const patterns = useMemo(() => {
    if (!found) return [];
    const raw = found.unit.lessons.flatMap((l) => (found.level.number === 1 ? [l.letter] : l.displayLetter.split(/\s+/)));
    return [...new Set(raw)];
  }, [found]);

  useEffect(() => {
    if (meta) play(promptAudio(meta.prompt, language));
    return () => stopVoice();
  }, [meta, language]);

  if (!found || !meta) return <Redirect href="/home" />;
  const Game = GAMES[gameId];
  const title = meta.title.includes('_') ? t(meta.title as StringKey) : meta.title;

  return (
    <Screen title={`${meta.emoji} ${title}`}>
      <AppText variant="caption" style={{ textAlign: 'center', paddingHorizontal: space.lg }}>
        {t(meta.guide)}
      </AppText>
      <Game
        key={runKey}
        level={found.level}
        unit={found.unit}
        words={words}
        patterns={patterns}
        onFinish={(s) => {
          completeGame(found.unit.id, gameId);
          logEvent('game_complete', { game: gameId, unit_id: found.unit.id, score: Math.round(s * 100) });
          setScore(s);
        }}
      />
      <Celebration
        visible={score != null}
        stars={score == null ? 0 : score >= 0.85 ? 3 : score >= 0.5 ? 2 : 1}
        title={t(meta.doneTitle)}
        subtitle={t(meta.doneSubtitle)}
        primary={{ label: t('step_home_action'), onPress: () => router.back() }}
        secondary={{ label: t('level_complete_replay'), onPress: () => (setScore(null), setRunKey((k) => k + 1)) }}
      />
    </Screen>
  );
}
