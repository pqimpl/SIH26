import { useCallback, useEffect, useState } from 'react';

import { GameType } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Period = 'Week' | 'Month' | 'All Time';

export type ProgressData = {
  overall: number | null;
  byGame: Record<GameType, number | null>;
  streakDays: number;
};

const GAME_TYPES: GameType[] = ['memory', 'brain_exercise', 'puzzle', 'rhythm'];

function periodStartIso(period: Period): string | null {
  const now = new Date();
  if (period === 'Week') {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  if (period === 'Month') {
    now.setDate(now.getDate() - 30);
    return now.toISOString();
  }
  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeStreak(dates: string[]): number {
  const uniqueDates = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  // Allow today to be "in progress" — start counting from today if present,
  // otherwise from yesterday, so an incomplete today doesn't zero the streak.
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!uniqueDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (uniqueDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useProgressData(patientId: string | null, period: Period) {
  const [data, setData] = useState<ProgressData>({
    overall: null,
    byGame: { memory: null, brain_exercise: null, puzzle: null, rhythm: null },
    streakDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setData({ overall: null, byGame: { memory: null, brain_exercise: null, puzzle: null, rhythm: null }, streakDays: 0 });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const startIso = periodStartIso(period);
    let scoresQuery = supabase.from('game_scores').select('game_type, score').eq('patient_id', patientId);
    if (startIso) scoresQuery = scoresQuery.gte('played_at', startIso);

    const [{ data: scoreRows }, { data: completionRows }] = await Promise.all([
      scoresQuery,
      supabase.from('daily_completions').select('completed_date').eq('patient_id', patientId),
    ]);

    const byGame = {} as Record<GameType, number | null>;
    for (const gameType of GAME_TYPES) {
      const values = (scoreRows ?? [])
        .filter((row) => row.game_type === gameType)
        .map((row) => row.score);
      byGame[gameType] = average(values);
    }
    const overall = average((scoreRows ?? []).map((row) => row.score));
    const streakDays = computeStreak((completionRows ?? []).map((row) => row.completed_date));

    setData({ overall, byGame, streakDays });
    setIsLoading(false);
  }, [patientId, period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, isLoading, refresh };
}
